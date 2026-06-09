using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class LeadStatusTransitionTests(ApiFactory factory)
{
    private static readonly JsonSerializerOptions JsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    private async Task<HttpClient> AuthClientAsync()
    {
        var client = factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email    = ApiFactory.AdminEmail,
            password = ApiFactory.AdminPassword,
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer",
                body.GetProperty("accessToken").GetString()!);
        return client;
    }

    private async Task<string> CreateLeadAsync(HttpClient client)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/leads", new
        {
            name     = "QA Переход",
            phone    = "+992900000000",
            product  = "Душевая кабина",
            callDate = "2026-06-04",
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("id").GetString()!;
    }

    /// <summary>Creates a measurement for the lead; returns the measurement id.</summary>
    private async Task<string> AddMeasurementAsync(
        HttpClient client, string leadId, decimal dealPriceTjs = 0m)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId        = Guid.Parse(leadId),
            measureMm     = 1560,
            heightMm      = 2000,
            glassColor    = "Transparent",
            hardwareColor = "BlackMatte",
            address       = "ул. Рудаки 1",
            dealPriceTjs,
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("id").GetString()!;
    }

    /// <summary>Creates a Deposit payment against a measurement.</summary>
    private async Task AddDepositAsync(HttpClient client, string measurementId, decimal amount)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/payments", new
        {
            measurementId = Guid.Parse(measurementId),
            amountTjs     = amount,
            kind          = "Deposit",
            paidAt        = "2026-06-05",
        });
        resp.EnsureSuccessStatusCode();
    }

    // ── Skip-step transitions from New ────────────────────────────────────────

    [Theory]
    [InlineData("Buying")]
    [InlineData("OrderedAtFactory")]
    [InlineData("GlassArrived")]
    [InlineData("Installed")]
    [InlineData("Closed")]
    public async Task PatchStatus_SkipStep_FromNew_Returns409(string target)
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var resp = await client.PatchAsJsonAsync(
            $"/api/v1/leads/{id}/status",
            new { status = target });

        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    // ── 409 body is a valid ProblemDetails ───────────────────────────────────

    [Fact]
    public async Task PatchStatus_ForbiddenTransition_Returns409WithProblemDetails()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var resp = await client.PatchAsJsonAsync(
            $"/api/v1/leads/{id}/status",
            new { status = "Buying" });

        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(409, body.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("detail").GetString()));
    }

    // ── Same status is a no-op (204, idempotent) ─────────────────────────────

    [Fact]
    public async Task PatchStatus_SameStatus_Returns204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var resp = await client.PatchAsJsonAsync(
            $"/api/v1/leads/{id}/status",
            new { status = "New" });

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    // ── Happy path: New → Measurement → Thinking ────────────────────────────

    [Fact]
    public async Task PatchStatus_NewToMeasurementToThinking_AllReturn204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var r1 = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Measurement",
        });
        Assert.Equal(HttpStatusCode.NoContent, r1.StatusCode);

        // Thinking requires at least one saved measurement
        await AddMeasurementAsync(client, id);

        var r2 = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Thinking",
        });
        Assert.Equal(HttpStatusCode.NoContent, r2.StatusCode);
    }

    // ── Happy path: New → Refused (with reason) ──────────────────────────────

    [Fact]
    public async Task PatchStatus_NewToRefused_WithReasonId_Returns204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var resp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status          = "Refused",
            refusalReasonId = Guid.NewGuid(),
            refusalNote     = "Дорого",
        });

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    // ── Re-open: Refused → New clears refusal data ───────────────────────────

    [Fact]
    public async Task PatchStatus_RefusedToNew_ClearsRefusalDataAndReturns204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status          = "Refused",
            refusalReasonId = Guid.NewGuid(),
        });

        var reopenResp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "New",
        });
        Assert.Equal(HttpStatusCode.NoContent, reopenResp.StatusCode);

        var detail = await (await client.GetAsync($"/api/v1/leads/{id}"))
            .Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("New", detail.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("refusalReasonId").ValueKind);
        Assert.Equal(JsonValueKind.Null, detail.GetProperty("refusalNote").ValueKind);
    }

    // ── Backwards transition (Measurement → New) is forbidden ────────────────

    [Fact]
    public async Task PatchStatus_BackwardsFromMeasurement_ToNew_Returns409()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Measurement",
        });

        var resp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "New",
        });

        Assert.Equal(HttpStatusCode.Conflict, resp.StatusCode);
    }

    // ── Missing required data for Refused → 400 ──────────────────────────────

    [Fact]
    public async Task PatchStatus_ToRefused_WithoutReasonId_Returns400()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        var resp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Refused",
            // refusalReasonId intentionally omitted
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
    }

    // ── Deposit gate (Step 8 / Step 13) ──────────────────────────────────────

    [Fact]
    public async Task PatchStatus_ToBuying_WithoutDeposit_Returns400_DepositBelowMinimum()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new { status = "Measurement" });
        // Measurement has dealPriceTjs=2000 but no deposit payment
        await AddMeasurementAsync(client, id, dealPriceTjs: 2000m);

        var resp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Buying",
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var errors = body.GetProperty("errors");
        Assert.True(errors.TryGetProperty("deposit", out _));
    }

    [Fact]
    public async Task PatchStatus_ToBuying_WithMeasurementAndDeposit_Returns204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new { status = "Measurement" });
        // dealPriceTjs on the measurement; deposit against the measurement's id
        var measurementId = await AddMeasurementAsync(client, id, dealPriceTjs: 2000m);
        await AddDepositAsync(client, measurementId, 100m);

        var resp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new
        {
            status = "Buying",
        });

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    // ── Lookups: GET /api/v1/refusal-reasons and /products ───────────────────

    [Fact]
    public async Task GetRefusalReasons_AuthenticatedUser_Returns200WithList()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync("/api/v1/refusal-reasons");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(JsonValueKind.Array, body.ValueKind);
    }

    [Fact]
    public async Task GetProducts_AuthenticatedUser_Returns200WithList()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync("/api/v1/products");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(JsonValueKind.Array, body.ValueKind);
    }
}

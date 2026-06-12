using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class AnalyticsTests(ApiFactory factory)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

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
        var token = body.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private async Task<string> CreateLeadAsync(HttpClient client, string product = "Душевая кабина")
    {
        var resp = await client.PostAsJsonAsync("/api/v1/leads", new
        {
            name     = "Analytics Test",
            phone    = "+992900000099",
            product,
            callDate = "2026-06-06",
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("id").GetString()!;
    }

    private async Task<string> AddMeasurementAsync(HttpClient client, string leadId,
        string glassColor = "Transparent", string hardwareColor = "BlackMatte")
    {
        var resp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId        = Guid.Parse(leadId),
            measureMm     = 1560,
            heightMm      = 2000,
            glassColor,
            hardwareColor,
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        return body.GetProperty("id").GetString()!;
    }

    // ── Auth guard ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboard_Unauthenticated_Returns401()
    {
        if (!factory.IsAvailable) return;

        var resp = await factory.CreateClient().GetAsync("/api/v1/analytics/dashboard");

        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }

    // ── Dashboard ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetDashboard_Returns200_WithValidShape()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync("/api/v1/analytics/dashboard");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("totalLeads").GetInt32() >= 0);
        Assert.True(body.GetProperty("activeLeads").GetInt32() >= 0);
        Assert.True(body.GetProperty("revenueTjs").GetDecimal() >= 0m);
    }

    // ── Funnel ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetFunnel_Returns200_WithAllNineStatuses()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync("/api/v1/analytics/funnel");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var statuses = body.GetProperty("statuses");
        Assert.Equal(9, statuses.GetArrayLength());

        var statusNames = statuses.EnumerateArray()
            .Select(s => s.GetProperty("status").GetString()!)
            .ToHashSet();

        string[] expected =
        [
            "New", "Measurement", "Thinking", "Refused",
            "Buying", "OrderedAtFactory", "GlassArrived", "Installed", "Closed"
        ];
        foreach (var name in expected)
            Assert.Contains(name, statusNames);
    }

    // ── Refusals ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetRefusals_WithRefusedLead_RowAppearsInResult()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var leadId = await CreateLeadAsync(client);
        var mId = await AddMeasurementAsync(client, leadId);

        var patch = await client.PatchAsJsonAsync($"/api/v1/measurements/{mId}/status", new
        {
            status          = "Refused",
            refusalReasonId = Guid.NewGuid(),
            refusalNote     = "Слишком дорого",
        });
        patch.EnsureSuccessStatusCode();

        var resp = await client.GetAsync("/api/v1/analytics/refusals");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("totalRefused").GetInt32() >= 1);
        Assert.True(body.GetProperty("reasons").GetArrayLength() >= 1);
    }

    // ── By product ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByProduct_WithLead_ProductAppearsInResult()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        const string product = "Стеклянные перегородки";
        await CreateLeadAsync(client, product);

        var resp = await client.GetAsync("/api/v1/analytics/by-product");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var products = body.GetProperty("products").EnumerateArray()
            .Select(p => p.GetProperty("product").GetString()!)
            .ToHashSet();

        Assert.Contains(product, products);
    }

    // ── By color ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByColor_WithMeasurement_GlassColorAppearsInResult()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);

        await AddMeasurementAsync(client, id, "Matte", "Gold");

        var resp = await client.GetAsync("/api/v1/analytics/by-color");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var glassColors = body.GetProperty("glassColors").EnumerateArray()
            .Select(c => c.GetProperty("color").GetString()!)
            .ToHashSet();

        Assert.Contains("Matte", glassColors);
    }

    // ── By measurer ───────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByMeasurer_WithAssignedLead_MeasurerRowAppearsInResult()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadAsync(client);
        var mId = await AddMeasurementAsync(client, id);

        var assign = await client.PostAsJsonAsync($"/api/v1/measurements/{mId}/assign-measurer", new
        {
            userId = factory.MeasurerId,
        });
        assign.EnsureSuccessStatusCode();

        var resp = await client.GetAsync("/api/v1/analytics/by-measurer");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var measurerIds = body.GetProperty("measurers").EnumerateArray()
            .Select(m => m.GetProperty("userId").GetString()!)
            .ToHashSet();

        Assert.Contains(factory.MeasurerId.ToString(), measurerIds);
    }
}

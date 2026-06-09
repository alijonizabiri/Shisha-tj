using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class PaymentTests(ApiFactory factory)
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
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString()!);
        return client;
    }

    /// <summary>Creates a lead in Measurement status and returns a measurementId linked to it.</summary>
    private async Task<(string leadId, string measurementId)> CreateLeadWithMeasurementAsync(HttpClient client)
    {
        var create = await client.PostAsJsonAsync("/api/v1/leads", new
        {
            name     = "Payment Test",
            phone    = "+992900000099",
            product  = "Душевая кабина",
            callDate = "2026-06-06",
        });
        create.EnsureSuccessStatusCode();
        var leadBody = await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var leadId = leadBody.GetProperty("id").GetString()!;

        await client.PatchAsJsonAsync($"/api/v1/leads/{leadId}/status", new { status = "Measurement" });

        var mResp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId        = Guid.Parse(leadId),
            measureMm     = 1560,
            heightMm      = 2000,
            glassColor    = "Transparent",
            hardwareColor = "BlackMatte",
            address       = "ул. Рудаки 1",
            dealPriceTjs  = 5000m,
        });
        mResp.EnsureSuccessStatusCode();
        var mBody = await mResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var measurementId = mBody.GetProperty("id").GetString()!;

        return (leadId, measurementId);
    }

    [Theory]
    [InlineData("Deposit")]
    [InlineData("Balance")]
    [InlineData("Refund")]
    public async Task CreatePayment_UnknownMeasurementId_Returns400ForAllKinds(string kind)
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();

        var resp = await client.PostAsJsonAsync("/api/v1/payments", new
        {
            measurementId = Guid.NewGuid(),  // non-existent
            amountTjs     = 500m,
            kind,
            paidAt        = "2026-06-06",
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("MEASUREMENT_NOT_FOUND", body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task CreatePayment_WithValidMeasurementId_Returns201()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var (_, measurementId) = await CreateLeadWithMeasurementAsync(client);

        var resp = await client.PostAsJsonAsync("/api/v1/payments", new
        {
            measurementId = Guid.Parse(measurementId),
            amountTjs     = 500m,
            kind          = "Deposit",
            paidAt        = "2026-06-06",
        });

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(measurementId, body.GetProperty("measurementId").GetString());
    }
}

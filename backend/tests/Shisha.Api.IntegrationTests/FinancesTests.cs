using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class FinancesTests(ApiFactory factory)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private async Task<HttpClient> AuthClientAsync()
    {
        var client = factory.CreateClient();
        var resp = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = ApiFactory.AdminEmail,
            password = ApiFactory.AdminPassword,
        });
        resp.EnsureSuccessStatusCode();
        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", body.GetProperty("accessToken").GetString()!);
        return client;
    }

    private static object DefaultLeadRequest() => new
    {
        name = "Finances Test",
        phone = "+992900000001",
        product = "Душевая кабина",
        callDate = "2026-06-05",
    };

    [Fact]
    public async Task GetLeadFinances_LeadWithNoMeasurements_ReturnsZeroCostsAndNullFields()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultLeadRequest());
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts)).GetProperty("id").GetString()!;

        var resp = await client.GetAsync($"/api/v1/leads/{id}/finances");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(id, body.GetProperty("leadId").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("dealPriceTjs").ValueKind);
        Assert.Equal(0m, body.GetProperty("glassCostTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("masterFeeTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("totalCostTjs").GetDecimal());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("profitTjs").ValueKind);
        Assert.Equal(0m, body.GetProperty("totalPaidTjs").GetDecimal());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("balanceDueTjs").ValueKind);
    }

    [Fact]
    public async Task GetLeadFinances_WithMeasurementAndPayment_ReturnsCorrectBreakdown()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();

        // Create lead
        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultLeadRequest());
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts)).GetProperty("id").GetString()!;
        var leadId = Guid.Parse(id);

        // New → Measurement
        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new { status = "Measurement" });

        // Create measurement with dealPrice=5000
        // measureMm=1560, heightMm=2000, TwoGlass: 2 panels of 800×2000
        // area = (800*2000 + 800*2000) / 1_000_000 = 3.2 m²
        // masterFee = 3.2 * 120 = 384 TJS
        var mResp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId,
            measureMm     = 1560,
            heightMm      = 2000,
            glassColor    = "Transparent",
            hardwareColor = "BlackMatte",
            address       = "ул. Рудаки 5",
            dealPriceTjs  = 5000m,
        });
        mResp.EnsureSuccessStatusCode();
        var mBody = await mResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var measurementId = Guid.Parse(mBody.GetProperty("id").GetString()!);

        // Deposit payment of 1000 TJS against this measurement (≥ MinDepositTjs=100)
        await client.PostAsJsonAsync("/api/v1/payments", new
        {
            measurementId,
            amountTjs = 1000m,
            kind      = "Deposit",
            paidAt    = "2026-06-05",
        });

        // Transition → Buying (dealPriceTjs comes from measurement, no longer in request)
        var buyingResp = await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new { status = "Buying" });
        Assert.Equal(HttpStatusCode.NoContent, buyingResp.StatusCode);

        // Verify lead finances aggregate
        var resp = await client.GetAsync($"/api/v1/leads/{id}/finances");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(id, body.GetProperty("leadId").GetString());
        Assert.Equal(5000m, body.GetProperty("dealPriceTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("glassCostTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("reworkCostTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("hardwareCostTjs").GetDecimal());
        Assert.Equal(384m, body.GetProperty("masterFeeTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("deliveryCostTjs").GetDecimal());
        Assert.Equal(0m, body.GetProperty("otherCostsTjs").GetDecimal());
        Assert.Equal(384m, body.GetProperty("totalCostTjs").GetDecimal());
        Assert.Equal(4616m, body.GetProperty("profitTjs").GetDecimal());    // 5000 - 384
        Assert.Equal(1000m, body.GetProperty("totalPaidTjs").GetDecimal());
        Assert.Equal(1000m, body.GetProperty("totalDepositTjs").GetDecimal());
        Assert.Equal(4000m, body.GetProperty("balanceDueTjs").GetDecimal()); // 5000 - 1000
    }

    [Fact]
    public async Task GetMeasurementFinances_WithMeasurementAndPayment_ReturnsCorrectBreakdown()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();

        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultLeadRequest());
        var leadId = (await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts)).GetProperty("id").GetString()!;

        await client.PatchAsJsonAsync($"/api/v1/leads/{leadId}/status", new { status = "Measurement" });

        var mResp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId = Guid.Parse(leadId),
            measureMm     = 1560,
            heightMm      = 2000,
            glassColor    = "Transparent",
            hardwareColor = "BlackMatte",
            address       = "пр. Дусти 10",
            dealPriceTjs  = 3000m,
        });
        mResp.EnsureSuccessStatusCode();
        var mBody = await mResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var measurementId = mBody.GetProperty("id").GetString()!;

        await client.PostAsJsonAsync("/api/v1/payments", new
        {
            measurementId = Guid.Parse(measurementId),
            amountTjs     = 500m,
            kind          = "Deposit",
            paidAt        = "2026-06-05",
        });

        var resp = await client.GetAsync($"/api/v1/measurements/{measurementId}/finances");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(measurementId, body.GetProperty("measurementId").GetString());
        Assert.Equal(3000m, body.GetProperty("dealPriceTjs").GetDecimal());
        Assert.Equal(384m, body.GetProperty("masterFeeTjs").GetDecimal());
        Assert.Equal(500m, body.GetProperty("totalPaidTjs").GetDecimal());
        Assert.Equal(500m, body.GetProperty("totalDepositTjs").GetDecimal());
        Assert.Equal(2500m, body.GetProperty("balanceDueTjs").GetDecimal()); // 3000 - 500
    }

    [Fact]
    public async Task GetLeadFinances_NotFound_Returns404()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync($"/api/v1/leads/{Guid.NewGuid()}/finances");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task GetLeadFinances_Unauthenticated_Returns401()
    {
        if (!factory.IsAvailable) return;

        var resp = await factory.CreateClient().GetAsync($"/api/v1/leads/{Guid.NewGuid()}/finances");
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}

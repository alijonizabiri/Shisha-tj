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

    private async Task<string> CreateLeadInMeasurementAsync(HttpClient client)
    {
        var create = await client.PostAsJsonAsync("/api/v1/leads", new
        {
            name     = "Payment Test",
            phone    = "+992900000099",
            product  = "Душевая кабина",
            callDate = "2026-06-06",
        });
        create.EnsureSuccessStatusCode();
        var body = await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = body.GetProperty("id").GetString()!;

        await client.PatchAsJsonAsync($"/api/v1/leads/{id}/status", new { status = "Measurement" });
        return id;
    }

    private async Task AddMeasurementAsync(HttpClient client, string leadId)
    {
        var resp = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            leadId        = Guid.Parse(leadId),
            measureMm     = 1560,
            heightMm      = 2000,
            configuration = "TwoGlass",
            glassColor    = "Transparent",
            hardwareColor = "BlackMatte",
        });
        resp.EnsureSuccessStatusCode();
    }

    [Theory]
    [InlineData("Deposit")]
    [InlineData("Balance")]
    [InlineData("Refund")]
    public async Task CreatePayment_WithoutMeasurement_Returns400ForAllKinds(string kind)
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadInMeasurementAsync(client);

        var resp = await client.PostAsJsonAsync("/api/v1/payments", new
        {
            leadId    = Guid.Parse(id),
            amountTjs = 500m,
            kind,
            paidAt    = "2026-06-06",
        });

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("MEASUREMENT_REQUIRED_FOR_PAYMENT",
            body.GetProperty("errorCode").GetString());
    }

    [Fact]
    public async Task CreatePayment_WithMeasurement_Returns201()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var id = await CreateLeadInMeasurementAsync(client);
        await AddMeasurementAsync(client, id);

        var resp = await client.PostAsJsonAsync("/api/v1/payments", new
        {
            leadId    = Guid.Parse(id),
            amountTjs = 500m,
            kind      = "Deposit",
            paidAt    = "2026-06-06",
        });

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
    }
}

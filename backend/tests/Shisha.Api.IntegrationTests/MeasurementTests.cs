using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class MeasurementTests(ApiFactory factory)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private HttpClient Client => factory.CreateClient();

    private async Task<HttpClient> AuthenticatedClientAsync()
    {
        var client = factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = ApiFactory.AdminEmail,
            password = ApiFactory.AdminPassword,
        });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var token = body.GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static object DefaultRequest(string config = "TwoGlass") => new
    {
        measureMm = 1560,
        heightMm = 2000,
        configuration = config,
        glassColor = "Transparent",
        hardwareColor = "BlackMatte",
        holes = new[]
        {
            new { panelIndex = 0, xMm = 10, yMm = 10, radiusMm = 12, holeType = "Mount" },
            new { panelIndex = 1, xMm = 10, yMm = 10, radiusMm = 12, holeType = "Roller" },
        },
    };

    [Fact]
    public async Task Create_ValidRequest_Returns201WithLocation()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.NotEqual(Guid.Empty, Guid.Parse(body.GetProperty("id").GetString()!));
        Assert.Equal(2, body.GetProperty("glasses").GetArrayLength());
    }

    [Fact]
    public async Task Create_ThreeGlass_Returns3Glasses()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest("ThreeGlass"));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(3, body.GetProperty("glasses").GetArrayLength());
    }

    [Fact]
    public async Task GetById_ExistingMeasurement_Returns200WithHoles()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var getResponse = await client.GetAsync($"/api/v1/measurements/{id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var body = await getResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(id, body.GetProperty("id").GetString());
        Assert.Equal(1560, body.GetProperty("measureMm").GetInt32());
        // First glass (fixed) should have 1 hole (Mount)
        var firstGlass = body.GetProperty("glasses")[0];
        Assert.Equal(1, firstGlass.GetProperty("holes").GetArrayLength());
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var response = await client.GetAsync($"/api/v1/measurements/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesConfig_ReturnsNewGlasses()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest("TwoGlass"));
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var updateRequest = new
        {
            measureMm = 1800,
            heightMm = 2200,
            configuration = "ThreeGlass",
            glassColor = "Matte",
            hardwareColor = "Gold",
            holes = Array.Empty<object>(),
        };

        var updateResponse = await client.PutAsJsonAsync($"/api/v1/measurements/{id}", updateRequest);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var body = await updateResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(3, body.GetProperty("glasses").GetArrayLength());
        Assert.Equal(1800, body.GetProperty("measureMm").GetInt32());
        Assert.Equal("ThreeGlass", body.GetProperty("configuration").GetString());
    }

    [Fact]
    public async Task Create_InvalidMeasureMm_Returns400()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/v1/measurements", new
        {
            measureMm = 100,  // below minimum 600
            heightMm = 2000,
            configuration = "TwoGlass",
            glassColor = "Transparent",
            hardwareColor = "BlackMatte",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        if (!factory.IsAvailable) return;

        var response = await Client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

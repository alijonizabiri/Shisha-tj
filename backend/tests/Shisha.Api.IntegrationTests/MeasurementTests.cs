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

    // Default request — no panels provided (server computes initial layout)
    private static object DefaultRequest() => new
    {
        measureMm = 1560,
        heightMm = 2000,
        glassColor = "Transparent",
        hardwareColor = "BlackMatte",
        holes = new[]
        {
            new { panelIndex = 0, xMm = 10, yMm = 10, radiusMm = 12, holeType = "Mount" },
            new { panelIndex = 1, xMm = 10, yMm = 10, radiusMm = 12, holeType = "Roller" },
        },
    };

    // Request with explicit panels
    private static object RequestWithPanels(object[] panels) => new
    {
        measureMm = 1560,
        heightMm = 2000,
        glassColor = "Transparent",
        hardwareColor = "BlackMatte",
        panels,
    };

    [Fact]
    public async Task Create_NoPanels_Returns201WithAutoComputedLayout()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var response = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.NotEqual(Guid.Empty, Guid.Parse(body.GetProperty("id").GetString()!));
        // measureMm=1560, totalWidth=1600 ≤ 1600 → 2 equal panels
        Assert.Equal(2, body.GetProperty("glasses").GetArrayLength());
        Assert.Equal(800, body.GetProperty("glasses")[0].GetProperty("widthMm").GetInt32());
        Assert.Equal(800, body.GetProperty("glasses")[1].GetProperty("widthMm").GetInt32());
    }

    [Fact]
    public async Task Create_WithExplicitPanels_PanelsSavedAsIs()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var panels = new[]
        {
            new { position = 0, widthMm = 600, heightMm = 2000, isDoor = false },
            new { position = 1, widthMm = 600, heightMm = 2000, isDoor = true  },
        };
        var response = await client.PostAsJsonAsync("/api/v1/measurements", RequestWithPanels(panels.Cast<object>().ToArray()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var glasses = body.GetProperty("glasses");
        Assert.Equal(2, glasses.GetArrayLength());
        Assert.Equal(600, glasses[0].GetProperty("widthMm").GetInt32());
        Assert.Equal(600, glasses[1].GetProperty("widthMm").GetInt32());
    }

    [Fact]
    public async Task Create_TwoDoors_Returns400()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var panels = new[]
        {
            new { position = 0, widthMm = 600, heightMm = 2000, isDoor = true },
            new { position = 1, widthMm = 600, heightMm = 2000, isDoor = true },
        };
        var response = await client.PostAsJsonAsync("/api/v1/measurements", RequestWithPanels(panels.Cast<object>().ToArray()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_DoorTooWide_Returns400()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var panels = new[]
        {
            new { position = 0, widthMm = 600, heightMm = 2000, isDoor = false },
            new { position = 1, widthMm = 900, heightMm = 2000, isDoor = true  },
        };
        var response = await client.PostAsJsonAsync("/api/v1/measurements", RequestWithPanels(panels.Cast<object>().ToArray()));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_PanelHeightExceedsCabin_Returns400()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var panels = new[]
        {
            new { position = 0, widthMm = 600, heightMm = 2100, isDoor = false },
            new { position = 1, widthMm = 600, heightMm = 2000, isDoor = true  },
        };
        var response = await client.PostAsJsonAsync("/api/v1/measurements", RequestWithPanels(panels.Cast<object>().ToArray()));

        // cabinHeightMm=2000, panel heightMm=2100 > 2000 → 400
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetById_ExistingMeasurement_Returns200WithGlasses()
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
        Assert.Equal(2, body.GetProperty("glasses").GetArrayLength());
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
    public async Task Update_WithPanels_ReturnsNewGlasses()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();

        var createResponse = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var updateRequest = new
        {
            measureMm = 1800,
            heightMm = 2200,
            glassColor = "Matte",
            hardwareColor = "Gold",
            panels = new[]
            {
                new { position = 0, widthMm = 500, heightMm = 2200, isDoor = false },
                new { position = 1, widthMm = 700, heightMm = 2200, isDoor = false },
                new { position = 2, widthMm = 640, heightMm = 2200, isDoor = true  },
            },
            holes = Array.Empty<object>(),
        };

        var updateResponse = await client.PutAsJsonAsync($"/api/v1/measurements/{id}", updateRequest);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var body = await updateResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(3, body.GetProperty("glasses").GetArrayLength());
        Assert.Equal(1800, body.GetProperty("measureMm").GetInt32());
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
            glassColor = "Transparent",
            hardwareColor = "BlackMatte",
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetPdf_ExistingMeasurement_ReturnsPdfBytes()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthenticatedClientAsync();
        var createResponse = await client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());
        var created = await createResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var pdfResponse = await client.GetAsync($"/api/v1/measurements/{id}/pdf?format=a4");

        Assert.Equal(HttpStatusCode.OK, pdfResponse.StatusCode);
        Assert.Equal("application/pdf", pdfResponse.Content.Headers.ContentType?.MediaType);
        var bytes = await pdfResponse.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length > 1000, "PDF should be non-trivial size");
    }

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        if (!factory.IsAvailable) return;

        var response = await Client.PostAsJsonAsync("/api/v1/measurements", DefaultRequest());
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}

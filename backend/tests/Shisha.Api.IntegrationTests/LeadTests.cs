using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class LeadTests(ApiFactory factory)
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

    private static object DefaultCreateRequest() => new
    {
        name     = "Иван Иванов",
        phone    = "+992901234567",
        product  = "Душевая кабина",
        source   = "Instagram",
        note     = "Замер в пятницу",
        callDate = "2026-06-04",
    };

    // ── CRUD happy-paths ──────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidRequest_Returns201WithLocation()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());

        Assert.Equal(HttpStatusCode.Created, resp.StatusCode);
        Assert.NotNull(resp.Headers.Location);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.NotEqual(Guid.Empty, Guid.Parse(body.GetProperty("id").GetString()!));
        Assert.Equal("Иван Иванов", body.GetProperty("name").GetString());
    }

    [Fact]
    public async Task GetList_ReturnsPagedResponse()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        await client.PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());

        var resp = await client.GetAsync("/api/v1/leads?page=1&pageSize=10");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.True(body.GetProperty("totalCount").GetInt32() >= 1);
        Assert.True(body.GetProperty("items").GetArrayLength() >= 1);
        Assert.Equal(1, body.GetProperty("page").GetInt32());
    }

    [Fact]
    public async Task GetById_ExistingLead_Returns200()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());
        var created = await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var resp = await client.GetAsync($"/api/v1/leads/{id}");
        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);

        var body = await resp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal(id, body.GetProperty("id").GetString());
        Assert.Equal("+992901234567", body.GetProperty("phone").GetString());
    }

    [Fact]
    public async Task GetById_NotFound_Returns404()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var resp = await client.GetAsync($"/api/v1/leads/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, resp.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesFields_Returns200()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());
        var created = await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var updateResp = await client.PutAsJsonAsync($"/api/v1/leads/{id}", new
        {
            name     = "Пётр Петров",
            phone    = "+992901234567",
            product  = "Стеклянная дверь",
            callDate = "2026-06-05",
        });

        Assert.Equal(HttpStatusCode.OK, updateResp.StatusCode);
        var body = await updateResp.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        Assert.Equal("Пётр Петров", body.GetProperty("name").GetString());
        Assert.Equal("Стеклянная дверь", body.GetProperty("product").GetString());
    }

    [Fact]
    public async Task Delete_ExistingLead_Returns204()
    {
        if (!factory.IsAvailable) return;

        var client = await AuthClientAsync();
        var create = await client.PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());
        var created = await create.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var id = created.GetProperty("id").GetString()!;

        var deleteResp = await client.DeleteAsync($"/api/v1/leads/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        var getResp = await client.GetAsync($"/api/v1/leads/{id}");
        Assert.Equal(HttpStatusCode.NotFound, getResp.StatusCode);
    }

    // ── Auth / role guards ─────────────────────────────────────────────────────

    [Fact]
    public async Task Create_Unauthenticated_Returns401()
    {
        if (!factory.IsAvailable) return;

        var resp = await factory.CreateClient().PostAsJsonAsync("/api/v1/leads", DefaultCreateRequest());
        Assert.Equal(HttpStatusCode.Unauthorized, resp.StatusCode);
    }
}

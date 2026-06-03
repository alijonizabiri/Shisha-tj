using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shisha.Api.IntegrationTests.Infrastructure;

namespace Shisha.Api.IntegrationTests;

[Collection(nameof(AuthCollection))]
public sealed class AuthFlowTests(ApiFactory factory)
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    private sealed record TokenResponse(string AccessToken, string RefreshToken, string ExpiresAt);

    private HttpClient Client => factory.CreateClient();

    private async Task<TokenResponse> LoginAsync()
    {
        var response = await Client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = ApiFactory.AdminEmail,
            password = ApiFactory.AdminPassword,
        });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<TokenResponse>(JsonOpts))!;
    }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithTokens()
    {
        if (!factory.IsAvailable) return; // Docker not running

        var response = await Client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = ApiFactory.AdminEmail,
            password = ApiFactory.AdminPassword,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<TokenResponse>(JsonOpts);
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
        Assert.NotEmpty(body.RefreshToken);
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        if (!factory.IsAvailable) return;

        var response = await Client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = ApiFactory.AdminEmail,
            password = "wrong-password",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401()
    {
        if (!factory.IsAvailable) return;

        var response = await Client.PostAsJsonAsync("/api/v1/auth/login", new
        {
            email = "nobody@nowhere.test",
            password = "any-password",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_ValidToken_Returns200WithNewTokens()
    {
        if (!factory.IsAvailable) return;

        var initial = await LoginAsync();

        var response = await Client.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = initial.RefreshToken,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<TokenResponse>(JsonOpts);
        Assert.NotNull(body);
        Assert.NotEmpty(body.AccessToken);
        Assert.NotEmpty(body.RefreshToken);
    }

    [Fact]
    public async Task Refresh_InvalidToken_Returns401()
    {
        if (!factory.IsAvailable) return;

        var response = await Client.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = Convert.ToBase64String(new byte[64]),
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Logout_ThenRefresh_Returns401()
    {
        if (!factory.IsAvailable) return;

        var tokens = await LoginAsync();

        var logoutResponse = await Client.PostAsJsonAsync("/api/v1/auth/logout", new
        {
            refreshToken = tokens.RefreshToken,
        });
        Assert.Equal(HttpStatusCode.NoContent, logoutResponse.StatusCode);

        var refreshResponse = await Client.PostAsJsonAsync("/api/v1/auth/refresh", new
        {
            refreshToken = tokens.RefreshToken,
        });
        Assert.Equal(HttpStatusCode.Unauthorized, refreshResponse.StatusCode);
    }
}

[CollectionDefinition(nameof(AuthCollection))]
public class AuthCollection : ICollectionFixture<ApiFactory> { }

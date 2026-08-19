<#
.SYNOPSIS
    Comprehensive API test suite for DGI Quantrum
.DESCRIPTION
    Tests ALL endpoints of the DGI Quantrum API running at http://localhost:4000.
    Generates colored output with pass/fail status and response times.
.NOTES
    Run from PowerShell: .\api-test.ps1
    Requires: PowerShell 5.1+
#>

param(
    [string]$BaseUrl = "http://localhost:4000",
    [string]$TestEmail = "test-api-user@demo.com",
    [string]$TestPassword = "demo1234",
    [string]$TestName = "API Test User",
    [string]$TestOrgName = "API Test Org $(Get-Date -Format 'yyyyMMddHHmmss')",
    [string]$AdminEmail = "admin@vida-nova.demo",
    [string]$AdminPassword = "demo1234"
)

$ErrorActionPreference = "Continue"

$script:TotalTests = 0
$script:PassedTests = 0
$script:FailedTests = 0
$script:TotalTime = 0
$script:Token = $null
$script:RefreshToken = $null
$script:TestLeadId = $null
$script:TestBrainId = $null
$script:TestUserId = $null

function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "  $Text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
}

function Write-SubHeader {
    param([string]$Text)
    Write-Host ""
    Write-Host "  >> $Text" -ForegroundColor Yellow
}

function Invoke-ApiTest {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [string]$Body = $null,
        [int[]]$ExpectedStatus = @(200),
        [switch]$Raw,
        [string]$ContentType = "application/json"
    )

    $script:TotalTests++
    $url = "$BaseUrl$Endpoint"

    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $params = @{
            Uri     = $url
            Method  = $Method
            Headers = $Headers
            TimeoutSec = 10
        }
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = $ContentType
        }

        $response = Invoke-WebRequest @params -ErrorAction Stop
        $sw.Stop()

        $status = $response.StatusCode
        $ms = $sw.ElapsedMilliseconds
        $script:TotalTime += $ms

        if ($ExpectedStatus -contains $status) {
            $script:PassedTests++
            $statusColor = "Green"
            $label = "PASS"
        } else {
            $script:FailedTests++
            $statusColor = "Red"
            $label = "FAIL"
        }

        $bodyPreview = ""
        if ($response.Content) {
            $truncated = $response.Content.Substring(0, [Math]::Min(120, $response.Content.Length))
            $bodyPreview = " | Body: $truncated"
        }

        Write-Host "    " -NoNewline
        Write-Host "[$label]" -NoNewline -ForegroundColor $statusColor
        Write-Host " $Name" -NoNewline -ForegroundColor White
        Write-Host " -> $status" -NoNewline -ForegroundColor DarkGray
        Write-Host " ($ms ms)" -ForegroundColor DarkGray

        return $response
    } catch {
        $sw.Stop()
        $ms = $sw.ElapsedMilliseconds
        $script:TotalTime += $ms

        $actualStatus = 0
        if ($_.Exception.Response) {
            $actualStatus = [int]$_.Exception.Response.StatusCode
        }

        if ($ExpectedStatus -contains $actualStatus -and $actualStatus -ne 0) {
            $script:PassedTests++
            $statusColor = "Green"
            $label = "PASS"
        } else {
            $script:FailedTests++
            $statusColor = "Red"
            $label = "FAIL"
        }

        $errMsg = $_.ErrorDetails.Message
        if (-not $errMsg) { $errMsg = $_.Exception.Message }
        $bodyPreview = ""
        if ($errMsg) {
            $truncated = $errMsg.Substring(0, [Math]::Min(120, $errMsg.Length))
            $bodyPreview = " | $truncated"
        }

        Write-Host "    " -NoNewline
        Write-Host "[$label]" -NoNewline -ForegroundColor $statusColor
        Write-Host " $Name" -NoNewline -ForegroundColor White
        Write-Host " -> $actualStatus" -NoNewline -ForegroundColor DarkGray
        Write-Host " ($ms ms)$bodyPreview" -ForegroundColor DarkGray

        return $null
    }
}

function Get-JsonBody {
    param([Microsoft.PowerShell.Commands.WebResponse]$Response)
    if ($Response -and $Response.Content) {
        try { return ($Response.Content | ConvertFrom-Json) } catch { return $null }
    }
    return $null
}

# ============================================================================
#  HEALTH
# ============================================================================
Write-Header "HEALTH ENDPOINTS"

Invoke-ApiTest -Name "GET /api/health" -Method GET -Endpoint "/api/health" -ExpectedStatus @(200)

# ============================================================================
#  AUTH - SIGNUP
# ============================================================================
Write-Header "AUTH ENDPOINTS"

Write-SubHeader "Signup"

$signupBody = @{
    name     = $TestName
    orgName  = $TestOrgName
    email    = $TestEmail
    password = $TestPassword
} | ConvertTo-Json

$signupResp = Invoke-ApiTest -Name "POST /api/auth/signup (valid)" -Method POST -Endpoint "/api/auth/signup" -Body $signupBody -ExpectedStatus @(201, 409)
if ($signupResp) {
    $signupData = Get-JsonBody -Response $signupResp
    if ($signupData.token) {
        $script:Token = $signupData.token
        $script:RefreshToken = $signupData.refreshToken
        $script:TestUserId = $signupData.user.id
        Write-Host "        -> Token acquired" -ForegroundColor DarkGray
    }
}

Invoke-ApiTest -Name "POST /api/auth/signup (duplicate)" -Method POST -Endpoint "/api/auth/signup" -Body $signupBody -ExpectedStatus @(409)

$badSignup = @{
    name     = ""
    orgName  = ""
    email    = ""
    password = "123"
} | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/auth/signup (invalid)" -Method POST -Endpoint "/api/auth/signup" -Body $badSignup -ExpectedStatus @(400)

# ============================================================================
#  AUTH - LOGIN (with demo admin)
# ============================================================================
Write-SubHeader "Login"

$loginBody = @{
    email    = $AdminEmail
    password = $AdminPassword
} | ConvertTo-Json

$loginResp = Invoke-ApiTest -Name "POST /api/auth/login (admin demo)" -Method POST -Endpoint "/api/auth/login" -Body $loginBody -ExpectedStatus @(200)
if ($loginResp) {
    $loginData = Get-JsonBody -Response $loginResp
    if ($loginData.token) {
        $script:Token = $loginData.token
        $script:RefreshToken = $loginData.refreshToken
        Write-Host "        -> Token acquired (admin)" -ForegroundColor DarkGray
    }
}

$badLogin = @{
    email    = $TestEmail
    password = "wrongpassword123"
} | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/auth/login (invalid credentials)" -Method POST -Endpoint "/api/auth/login" -Body $badLogin -ExpectedStatus @(401)

$emptyLogin = @{
    email    = ""
    password = ""
} | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/auth/login (empty)" -Method POST -Endpoint "/api/auth/login" -Body $emptyLogin -ExpectedStatus @(400)

# ============================================================================
#  AUTH - ME
# ============================================================================
Write-SubHeader "Current User"

$authHeaders = @{}
if ($script:Token) { $authHeaders["Authorization"] = "Bearer $script:Token" }

$meResp = Invoke-ApiTest -Name "GET /api/auth/me (authenticated)" -Method GET -Endpoint "/api/auth/me" -Headers $authHeaders -ExpectedStatus @(200)
if ($meResp) {
    $meData = Get-JsonBody -Response $meResp
    if ($meData.user -and $meData.user.id) {
        Write-Host "        -> User: $($meData.user.email) ($($meData.user.role))" -ForegroundColor DarkGray
    }
}

Invoke-ApiTest -Name "GET /api/auth/me (no token)" -Method GET -Endpoint "/api/auth/me" -ExpectedStatus @(401)

# ============================================================================
#  AUTH - REFRESH
# ============================================================================
Write-SubHeader "Token Refresh"

if ($script:RefreshToken) {
    $refreshBody = @{ refreshToken = $script:RefreshToken } | ConvertTo-Json
    $refreshResp = Invoke-ApiTest -Name "POST /api/auth/refresh (valid)" -Method POST -Endpoint "/api/auth/refresh" -Body $refreshBody -ExpectedStatus @(200)
    if ($refreshResp) {
        $refreshData = Get-JsonBody -Response $refreshResp
        if ($refreshData.token) {
            $script:Token = $refreshData.token
            $script:RefreshToken = $refreshData.refreshToken
            $authHeaders["Authorization"] = "Bearer $($script:Token)"
            Write-Host "        -> Token rotated" -ForegroundColor DarkGray
        }
    }
}

Invoke-ApiTest -Name "POST /api/auth/refresh (invalid token)" -Method POST -Endpoint "/api/auth/refresh" -Body '{"refreshToken":"invalid-token-12345"}' -ExpectedStatus @(401)

Invoke-ApiTest -Name "POST /api/auth/refresh (empty)" -Method POST -Endpoint "/api/auth/refresh" -Body '{}' -ExpectedStatus @(400)

# ============================================================================
#  BRAIN ENDPOINTS
# ============================================================================
Write-Header "BRAIN ENDPOINTS"

$brainHeaders = @{}
if ($script:Token) { $brainHeaders["Authorization"] = "Bearer $script:Token" }

$brainCategoriesResp = Invoke-ApiTest -Name "GET /api/brain/categories" -Method GET -Endpoint "/api/brain/categories" -Headers $brainHeaders -ExpectedStatus @(200)
if ($brainCategoriesResp) {
    $catData = Get-JsonBody -Response $brainCategoriesResp
    if ($catData.categories) {
        Write-Host "        -> Categories: $($catData.categories -join ', ')" -ForegroundColor DarkGray
    }
}

$brainListResp = Invoke-ApiTest -Name "GET /api/brain (list)" -Method GET -Endpoint "/api/brain" -Headers $brainHeaders -ExpectedStatus @(200)
if ($brainListResp) {
    $brainData = Get-JsonBody -Response $brainListResp
    if ($brainData.items) {
        Write-Host "        -> Items: $($brainData.items.Count)" -ForegroundColor DarkGray
    }
}

$brainCreateBody = @{
    category = "FAQ"
    title    = "Test Brain Item - $(Get-Date -Format 'yyyyMMddHHmmss')"
    content  = "This is a test brain item created by the API test script."
    keywords = "test, api, automated"
} | ConvertTo-Json

$brainCreateResp = Invoke-ApiTest -Name "POST /api/brain (create item)" -Method POST -Endpoint "/api/brain" -Headers $brainHeaders -Body $brainCreateBody -ExpectedStatus @(201)
if ($brainCreateResp) {
    $newBrain = Get-JsonBody -Response $brainCreateResp
    if ($newBrain.item -and $newBrain.item.id) {
        $script:TestBrainId = $newBrain.item.id
        Write-Host "        -> Created brain item: $($newBrain.item.id)" -ForegroundColor DarkGray
    }
}

Invoke-ApiTest -Name "POST /api/brain (invalid category)" -Method POST -Endpoint "/api/brain" -Headers $brainHeaders -Body '{"category":"INVALID","title":"test","content":"test"}' -ExpectedStatus @(400)

Invoke-ApiTest -Name "POST /api/brain (missing fields)" -Method POST -Endpoint "/api/brain" -Headers $brainHeaders -Body '{"category":"FAQ"}' -ExpectedStatus @(400)

$testPlayground = @{ text = "What products do you offer?" } | ConvertTo-Json
$playgroundResp = Invoke-ApiTest -Name "POST /api/brain/test (playground)" -Method POST -Endpoint "/api/brain/test" -Headers $brainHeaders -Body $testPlayground -ExpectedStatus @(200)
if ($playgroundResp) {
    $pgData = Get-JsonBody -Response $playgroundResp
    if ($pgData.reply) {
        $replyPreview = $pgData.reply.Substring(0, [Math]::Min(80, $pgData.reply.Length))
        Write-Host "        -> Reply preview: $replyPreview" -ForegroundColor DarkGray
    }
}

Invoke-ApiTest -Name "POST /api/brain/test (empty text)" -Method POST -Endpoint "/api/brain/test" -Headers $brainHeaders -Body '{}' -ExpectedStatus @(400)

if ($script:TestBrainId) {
    $patchBrain = @{ title = "Updated Test Brain Item"; active = $true } | ConvertTo-Json
    Invoke-ApiTest -Name "PATCH /api/brain/:id (update)" -Method PATCH -Endpoint "/api/brain/$($script:TestBrainId)" -Headers $brainHeaders -Body $patchBrain -ExpectedStatus @(200)
    Invoke-ApiTest -Name "DELETE /api/brain/:id (delete)" -Method DELETE -Endpoint "/api/brain/$($script:TestBrainId)" -Headers $brainHeaders -ExpectedStatus @(200)
}

Invoke-ApiTest -Name "PATCH /api/brain/:id (not found)" -Method PATCH -Endpoint "/api/brain/nonexistent-id" -Headers $brainHeaders -Body '{"title":"test"}' -ExpectedStatus @(404)

# ============================================================================
#  LEADS ENDPOINTS
# ============================================================================
Write-Header "LEADS ENDPOINTS"

$leadsHeaders = @{}
if ($script:Token) { $leadsHeaders["Authorization"] = "Bearer $script:Token" }

$leadsListResp = Invoke-ApiTest -Name "GET /api/leads (list)" -Method GET -Endpoint "/api/leads" -Headers $leadsHeaders -ExpectedStatus @(200)
if ($leadsListResp) {
    $leadsData = Get-JsonBody -Response $leadsListResp
    if ($leadsData.items) {
        Write-Host "        -> Leads count: $($leadsData.items.Count)" -ForegroundColor DarkGray
        if ($leadsData.items.Count -gt 0) {
            $script:TestLeadId = $leadsData.items[0].id
        }
    }
}

Invoke-ApiTest -Name "GET /api/leads?status=NEW" -Method GET -Endpoint "/api/leads?status=NEW" -Headers $leadsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/leads?q=test" -Method GET -Endpoint "/api/leads?q=test" -Headers $leadsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/leads?page=1&pageSize=5" -Method GET -Endpoint "/api/leads?page=1&pageSize=5" -Headers $leadsHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/leads/conversations" -Method GET -Endpoint "/api/leads/conversations" -Headers $leadsHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/leads (no auth)" -Method GET -Endpoint "/api/leads" -ExpectedStatus @(401)

if ($script:TestLeadId) {
    $leadDetailResp = Invoke-ApiTest -Name "GET /api/leads/:id (detail)" -Method GET -Endpoint "/api/leads/$($script:TestLeadId)" -Headers $leadsHeaders -ExpectedStatus @(200)
    if ($leadDetailResp) {
        $leadDetail = Get-JsonBody -Response $leadDetailResp
        Write-Host "        -> Lead: $($leadDetail.lead.name) ($($leadDetail.lead.status))" -ForegroundColor DarkGray
    }

    $patchLead = @{ status = "IN_CONVERSATION"; score = 5 } | ConvertTo-Json
    Invoke-ApiTest -Name "PATCH /api/leads/:id (update status)" -Method PATCH -Endpoint "/api/leads/$($script:TestLeadId)" -Headers $leadsHeaders -Body $patchLead -ExpectedStatus @(200)
}

Invoke-ApiTest -Name "GET /api/leads/:id (not found)" -Method GET -Endpoint "/api/leads/nonexistent-id-12345" -Headers $leadsHeaders -ExpectedStatus @(404)
Invoke-ApiTest -Name "PATCH /api/leads/:id (not found)" -Method PATCH -Endpoint "/api/leads/nonexistent-id-12345" -Headers $leadsHeaders -Body '{"status":"NEW"}' -ExpectedStatus @(404)

# ============================================================================
#  ANALYTICS ENDPOINTS
# ============================================================================
Write-Header "ANALYTICS ENDPOINTS"

$analyticsHeaders = @{}
if ($script:Token) { $analyticsHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/analytics/overview" -Method GET -Endpoint "/api/analytics/overview" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/funnel" -Method GET -Endpoint "/api/analytics/funnel" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/timeseries" -Method GET -Endpoint "/api/analytics/timeseries" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/score-distribution" -Method GET -Endpoint "/api/analytics/score-distribution" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/velocity" -Method GET -Endpoint "/api/analytics/velocity" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/sources" -Method GET -Endpoint "/api/analytics/sources" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/cohorts" -Method GET -Endpoint "/api/analytics/cohorts" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/executive" -Method GET -Endpoint "/api/analytics/executive" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/report" -Method GET -Endpoint "/api/analytics/report" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/distributors" -Method GET -Endpoint "/api/analytics/distributors" -Headers $analyticsHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/analytics/variants" -Method GET -Endpoint "/api/analytics/variants" -Headers $analyticsHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/analytics/overview (no auth)" -Method GET -Endpoint "/api/analytics/overview" -ExpectedStatus @(401)

# ============================================================================
#  PUBLIC FUNNEL ENDPOINTS
# ============================================================================
Write-Header "PUBLIC FUNNEL ENDPOINTS"

Invoke-ApiTest -Name "GET /api/public/f/test-slug" -Method GET -Endpoint "/api/public/f/test-slug" -ExpectedStatus @(404)

$chatBody = @{ message = "Hello, I'm interested in your products" } | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/public/f/test-slug/chat" -Method POST -Endpoint "/api/public/f/test-slug/chat" -Body $chatBody -ExpectedStatus @(400, 404)

Invoke-ApiTest -Name "POST /api/public/f/test-slug/chat (empty)" -Method POST -Endpoint "/api/public/f/test-slug/chat" -Body '{}' -ExpectedStatus @(400, 404)

# ============================================================================
#  INTEGRATIONS ENDPOINTS
# ============================================================================
Write-Header "INTEGRATIONS ENDPOINTS"

$integHeaders = @{}
if ($script:Token) { $integHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "POST /api/integrations/slack/notify (no config)" -Method POST -Endpoint "/api/integrations/slack/notify" -Headers $integHeaders -Body '{"leadId":"test","event":"lead.created"}' -ExpectedStatus @(400, 404)

Invoke-ApiTest -Name "POST /api/integrations/hubspot/sync (no config)" -Method POST -Endpoint "/api/integrations/hubspot/sync" -Headers $integHeaders -Body '{"leadId":"test"}' -ExpectedStatus @(400, 404)

Invoke-ApiTest -Name "POST /api/integrations/slack/notify (no auth)" -Method POST -Endpoint "/api/integrations/slack/notify" -Body '{"leadId":"test","event":"lead.created"}' -ExpectedStatus @(401)

Invoke-ApiTest -Name "POST /api/integrations/hubspot/sync (no auth)" -Method POST -Endpoint "/api/integrations/hubspot/sync" -Body '{"leadId":"test"}' -ExpectedStatus @(401)

# ============================================================================
#  WEBHOOKS ENDPOINTS
# ============================================================================
Write-Header "WEBHOOKS ENDPOINTS"

Invoke-ApiTest -Name "GET /api/webhooks/test-org/whatsapp (verification)" -Method GET -Endpoint "/api/webhooks/test-org/whatsapp?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test123" -ExpectedStatus @(403, 404)

$genericWebhook = @{ from = "+1234567890"; text = "Hello from webhook" } | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/webhooks/test-org/generic" -Method POST -Endpoint "/api/webhooks/test-org/generic" -Body $genericWebhook -ExpectedStatus @(200, 404)

Invoke-ApiTest -Name "POST /api/webhooks/test-org/generic (missing fields)" -Method POST -Endpoint "/api/webhooks/test-org/generic" -Body '{}' -ExpectedStatus @(400, 404)

Invoke-ApiTest -Name "POST /api/webhooks/test-org/whatsapp (incoming)" -Method POST -Endpoint "/api/webhooks/test-org/whatsapp" -Body '{"From":"whatsapp:+1234567890","Body":"Hello"}' -ExpectedStatus @(200, 401, 404)

Invoke-ApiTest -Name "GET /api/webhooks/test-org/logs" -Method GET -Endpoint "/api/webhooks/test-org/logs" -ExpectedStatus @(200, 401)

# ============================================================================
#  DOWNLINE ENDPOINTS
# ============================================================================
Write-Header "DOWNLINE ENDPOINTS"

$downlineHeaders = @{}
if ($script:Token) { $downlineHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/downline/overview" -Method GET -Endpoint "/api/downline/overview" -Headers $downlineHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/downline/tree" -Method GET -Endpoint "/api/downline/tree" -Headers $downlineHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/downline/overview (no auth)" -Method GET -Endpoint "/api/downline/overview" -ExpectedStatus @(401)

# ============================================================================
#  BILLING ENDPOINTS
# ============================================================================
Write-Header "BILLING ENDPOINTS"

$billingHeaders = @{}
if ($script:Token) { $billingHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/billing" -Method GET -Endpoint "/api/billing" -Headers $billingHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/billing/plans" -Method GET -Endpoint "/api/billing/plans" -Headers $billingHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "POST /api/billing/checkout (invalid plan)" -Method POST -Endpoint "/api/billing/checkout" -Headers $billingHeaders -Body '{"planId":"INVALID"}' -ExpectedStatus @(400)

Invoke-ApiTest -Name "GET /api/billing (no auth)" -Method GET -Endpoint "/api/billing" -ExpectedStatus @(401)

# ============================================================================
#  EXPORT ENDPOINTS
# ============================================================================
Write-Header "EXPORT ENDPOINTS"

$exportHeaders = @{}
if ($script:Token) { $exportHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/export/leads?format=json" -Method GET -Endpoint "/api/export/leads?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/leads?format=csv" -Method GET -Endpoint "/api/export/leads?format=csv" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/brain?format=json" -Method GET -Endpoint "/api/export/brain?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/distributors?format=json" -Method GET -Endpoint "/api/export/distributors?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/commissions?format=json" -Method GET -Endpoint "/api/export/commissions?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/sessions?format=json" -Method GET -Endpoint "/api/export/sessions?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/analytics?format=json" -Method GET -Endpoint "/api/export/analytics?format=json" -Headers $exportHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/export/invalid?format=json" -Method GET -Endpoint "/api/export/invalid?format=json" -Headers $exportHeaders -ExpectedStatus @(400)
Invoke-ApiTest -Name "GET /api/export/leads?format=invalid" -Method GET -Endpoint "/api/export/leads?format=xml" -Headers $exportHeaders -ExpectedStatus @(400)

Invoke-ApiTest -Name "GET /api/export/leads (no auth)" -Method GET -Endpoint "/api/export/leads?format=json" -ExpectedStatus @(401)

# ============================================================================
#  API KEYS ENDPOINTS
# ============================================================================
Write-Header "API KEYS ENDPOINTS"

$keysHeaders = @{}
if ($script:Token) { $keysHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/keys" -Method GET -Endpoint "/api/keys" -Headers $keysHeaders -ExpectedStatus @(200)

$apiKeyBody = @{
    name   = "Test API Key $(Get-Date -Format 'yyyyMMddHHmmss')"
    scopes = @("leads:read", "analytics:read")
} | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/keys (create)" -Method POST -Endpoint "/api/keys" -Headers $keysHeaders -Body $apiKeyBody -ExpectedStatus @(201)

Invoke-ApiTest -Name "POST /api/keys (missing name)" -Method POST -Endpoint "/api/keys" -Headers $keysHeaders -Body '{}' -ExpectedStatus @(400)

Invoke-ApiTest -Name "GET /api/keys (no auth)" -Method GET -Endpoint "/api/keys" -ExpectedStatus @(401)

# ============================================================================
#  TEAM ENDPOINTS
# ============================================================================
Write-Header "TEAM ENDPOINTS"

$teamHeaders = @{}
if ($script:Token) { $teamHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/team" -Method GET -Endpoint "/api/team" -Headers $teamHeaders -ExpectedStatus @(200)

$inviteBody = @{
    email = "team-member-$([guid]::NewGuid().ToString('N').Substring(0,8))@example.com"
    name  = "Test Team Member"
    role  = "MANAGER"
} | ConvertTo-Json
Invoke-ApiTest -Name "POST /api/team/invite (valid)" -Method POST -Endpoint "/api/team/invite" -Headers $teamHeaders -Body $inviteBody -ExpectedStatus @(201)

Invoke-ApiTest -Name "POST /api/team/invite (invalid role)" -Method POST -Endpoint "/api/team/invite" -Headers $teamHeaders -Body '{"email":"test@test.com","name":"Test","role":"INVALID"}' -ExpectedStatus @(400)

Invoke-ApiTest -Name "POST /api/team/invite (missing fields)" -Method POST -Endpoint "/api/team/invite" -Headers $teamHeaders -Body '{}' -ExpectedStatus @(400)

Invoke-ApiTest -Name "GET /api/team (no auth)" -Method GET -Endpoint "/api/team" -ExpectedStatus @(401)

# ============================================================================
#  NOTIFICATIONS ENDPOINTS
# ============================================================================
Write-Header "NOTIFICATIONS ENDPOINTS"

$notifHeaders = @{}
if ($script:Token) { $notifHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/notifications" -Method GET -Endpoint "/api/notifications" -Headers $notifHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "GET /api/notifications?unreadOnly=true" -Method GET -Endpoint "/api/notifications?unreadOnly=true" -Headers $notifHeaders -ExpectedStatus @(200)
Invoke-ApiTest -Name "POST /api/notifications/read-all" -Method POST -Endpoint "/api/notifications/read-all" -Headers $notifHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/notifications (no auth)" -Method GET -Endpoint "/api/notifications" -ExpectedStatus @(401)

# ============================================================================
#  V1 API ENDPOINTS (API Key Auth)
# ============================================================================
Write-Header "V1 API ENDPOINTS (API Key)"

Invoke-ApiTest -Name "GET /api/v1/leads (no API key)" -Method GET -Endpoint "/api/v1/leads" -ExpectedStatus @(401)
Invoke-ApiTest -Name "GET /api/v1/leads/:id (no API key)" -Method GET -Endpoint "/api/v1/leads/test-id" -ExpectedStatus @(401)
Invoke-ApiTest -Name "GET /api/v1/analytics (no API key)" -Method GET -Endpoint "/api/v1/analytics" -ExpectedStatus @(401)
Invoke-ApiTest -Name "GET /api/v1/brain (no API key)" -Method GET -Endpoint "/api/v1/brain" -ExpectedStatus @(401)

Invoke-ApiTest -Name "GET /api/v1/openapi.json" -Method GET -Endpoint "/api/v1/openapi.json" -ExpectedStatus @(200)

# ============================================================================
#  ORG ENDPOINTS
# ============================================================================
Write-Header "ORG ENDPOINTS"

$orgHeaders = @{}
if ($script:Token) { $orgHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/org" -Method GET -Endpoint "/api/org" -Headers $orgHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/org (no auth)" -Method GET -Endpoint "/api/org" -ExpectedStatus @(401)

# ============================================================================
#  FOLLOWUPS ENDPOINTS
# ============================================================================
Write-Header "FOLLOWUPS ENDPOINTS"

$followupHeaders = @{}
if ($script:Token) { $followupHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/followups" -Method GET -Endpoint "/api/followups" -Headers $followupHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/followups (no auth)" -Method GET -Endpoint "/api/followups" -ExpectedStatus @(401)

# ============================================================================
#  DISTRIBUTORS ENDPOINTS
# ============================================================================
Write-Header "DISTRIBUTORS ENDPOINTS"

$distHeaders = @{}
if ($script:Token) { $distHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/distributors" -Method GET -Endpoint "/api/distributors" -Headers $distHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/distributors (no auth)" -Method GET -Endpoint "/api/distributors" -ExpectedStatus @(401)

# ============================================================================
#  AUDIT ENDPOINTS
# ============================================================================
Write-Header "AUDIT ENDPOINTS"

$auditHeaders = @{}
if ($script:Token) { $auditHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/audit" -Method GET -Endpoint "/api/audit" -Headers $auditHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/audit (no auth)" -Method GET -Endpoint "/api/audit" -ExpectedStatus @(401)

# ============================================================================
#  PUSH ENDPOINTS
# ============================================================================
Write-Header "PUSH ENDPOINTS"

$pushHeaders = @{}
if ($script:Token) { $pushHeaders["Authorization"] = "Bearer $script:Token" }

Invoke-ApiTest -Name "GET /api/push" -Method GET -Endpoint "/api/push" -Headers $pushHeaders -ExpectedStatus @(200)

Invoke-ApiTest -Name "GET /api/push (no auth)" -Method GET -Endpoint "/api/push" -ExpectedStatus @(401)

# ============================================================================
#  DOCS ENDPOINT
# ============================================================================
Write-Header "DOCS ENDPOINT"

Invoke-ApiTest -Name "GET /api/docs" -Method GET -Endpoint "/api/docs/" -ExpectedStatus @(200)

# ============================================================================
#  404 HANDLING
# ============================================================================
Write-Header "404 HANDLING"

Invoke-ApiTest -Name "GET /api/nonexistent-endpoint" -Method GET -Endpoint "/api/nonexistent-endpoint" -ExpectedStatus @(404)
Invoke-ApiTest -Name "POST /api/also-nonexistent" -Method POST -Endpoint "/api/also-nonexistent" -Body '{}' -ExpectedStatus @(404)

# ============================================================================
#  AUTH - LOGOUT (at the end)
# ============================================================================
Write-Header "AUTH ENDPOINTS (Logout)"

$logoutHeaders = @{}
if ($script:Token) { $logoutHeaders["Authorization"] = "Bearer $script:Token" }

if ($script:RefreshToken) {
    $logoutBody = @{ refreshToken = $script:RefreshToken } | ConvertTo-Json
    Invoke-ApiTest -Name "POST /api/auth/logout" -Method POST -Endpoint "/api/auth/logout" -Headers $logoutHeaders -Body $logoutBody -ExpectedStatus @(200)
} else {
    Invoke-ApiTest -Name "POST /api/auth/logout (no refresh token)" -Method POST -Endpoint "/api/auth/logout" -Headers $logoutHeaders -Body '{}' -ExpectedStatus @(200)
}

# ============================================================================
#  SUMMARY
# ============================================================================
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Total Tests:    $script:TotalTests" -ForegroundColor White
Write-Host "  Passed:         $script:PassedTests" -ForegroundColor Green
Write-Host "  Failed:         $script:FailedTests" -ForegroundColor $(if ($script:FailedTests -gt 0) { "Red" } else { "Green" })
$avgTime = if ($script:TotalTests -gt 0) { [Math]::Round($script:TotalTime / $script:TotalTests) } else { 0 }
Write-Host "  Avg Response:   ${avgTime}ms" -ForegroundColor White
Write-Host "  Total Time:     $([Math]::Round($script:TotalTime / 1000, 1))s" -ForegroundColor White
Write-Host ""

$passRate = if ($script:TotalTests -gt 0) { [Math]::Round(($script:PassedTests / $script:TotalTests) * 100) } else { 0 }
if ($script:FailedTests -eq 0) {
    Write-Host "  ALL TESTS PASSED!" -ForegroundColor Green -BackgroundColor DarkGreen
} else {
    Write-Host "  $script:FailedTests test(s) failed" -ForegroundColor Red -BackgroundColor DarkRed
}

Write-Host ""
Write-Host "  Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host ""

# Exit with non-zero if any tests failed
if ($script:FailedTests -gt 0) { exit 1 }

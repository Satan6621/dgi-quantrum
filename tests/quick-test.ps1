# DGI Quantrum - Quick API Test
# Run: powershell -ExecutionPolicy Bypass -File quick-test.ps1

$BaseUrl = "http://localhost:4000"
$passed = 0
$failed = 0

function Test-Endpoint {
    param($Name, $Method, $Path, $Body, $Headers, $ExpectedStatus)
    
    try {
        $params = @{
            Uri = "$BaseUrl$Path"
            Method = $Method
            TimeoutSec = 5
            UseBasicParsing = $true
        }
        if ($Body) { $params.Body = $Body; $params.ContentType = "application/json" }
        if ($Headers) { $params.Headers = $Headers }
        
        $r = Invoke-WebRequest @params
        $status = $r.StatusCode
        $ok = $ExpectedStatus -contains $status
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
        $ok = $ExpectedStatus -contains $status
    }
    
    if ($ok) { Write-Host "  [PASS] $Name -> $status" -ForegroundColor Green; $script:passed++ }
    else { Write-Host "  [FAIL] $Name -> $status (expected: $($ExpectedStatus -join '|'))" -ForegroundColor Red; $script:failed++ }
}

Write-Host "`n=== DGI Quantrum API Tests ===" -ForegroundColor Cyan

# Health
Write-Host "`n--- Health ---" -ForegroundColor Yellow
Test-Endpoint "Health check" GET "/api/health" $null $null @(200)

# Auth
Write-Host "`n--- Auth ---" -ForegroundColor Yellow
$body = '{"email":"admin@vida-nova.demo","password":"demo1234"}'
$r = Invoke-WebRequest -Uri "$BaseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 5
$token = ($r.Content | ConvertFrom-Json).token
$headers = @{Authorization = "Bearer $token"}

Test-Endpoint "Login admin" POST "/api/auth/login" $body $null @(200)
Test-Endpoint "Login invalid" POST "/api/auth/login" '{"email":"x@x.com","password":"wrong"}' $null @(401)
Test-Endpoint "Get me" GET "/api/auth/me" $null $headers @(200)
Test-Endpoint "No auth" GET "/api/auth/me" $null $null @(401)

# Brain
Write-Host "`n--- Brain ---" -ForegroundColor Yellow
Test-Endpoint "List brain" GET "/api/brain" $null $headers @(200)
Test-Endpoint "Categories" GET "/api/brain/categories" $null $headers @(200)

# Leads
Write-Host "`n--- Leads ---" -ForegroundColor Yellow
Test-Endpoint "List leads" GET "/api/leads" $null $headers @(200)
Test-Endpoint "Leads with filter" GET "/api/leads?status=NEW" $null $headers @(200)

# Analytics
Write-Host "`n--- Analytics ---" -ForegroundColor Yellow
Test-Endpoint "Overview" GET "/api/analytics/overview" $null $headers @(200)
Test-Endpoint "Funnel" GET "/api/analytics/funnel" $null $headers @(200)
Test-Endpoint "Velocity" GET "/api/analytics/velocity" $null $headers @(200)
Test-Endpoint "Sources" GET "/api/analytics/sources" $null $headers @(200)
Test-Endpoint "Cohorts" GET "/api/analytics/cohorts" $null $headers @(200)
Test-Endpoint "Executive" GET "/api/analytics/executive" $null $headers @(200)
Test-Endpoint "Report" GET "/api/analytics/report" $null $headers @(200)

# Public Funnel
Write-Host "`n--- Public Funnel ---" -ForegroundColor Yellow
Test-Endpoint "Funnel profile" GET "/api/public/f/maria-gonzalez" $null $null @(200)
$chatBody = '{"message":"Hola, quiero saber mas","sessionId":"test-123"}'
Test-Endpoint "Chat" POST "/api/public/f/maria-gonzalez/chat" $chatBody $null @(200)

# Downline
Write-Host "`n--- Downline ---" -ForegroundColor Yellow
Test-Endpoint "Overview" GET "/api/downline/overview" $null $headers @(200)
Test-Endpoint "Tree" GET "/api/downline/tree" $null $headers @(200)

# Billing
Write-Host "`n--- Billing ---" -ForegroundColor Yellow
Test-Endpoint "Billing" GET "/api/billing" $null $headers @(200)
Test-Endpoint "Plans" GET "/api/billing/plans" $null $headers @(200)

# Export
Write-Host "`n--- Export ---" -ForegroundColor Yellow
Test-Endpoint "Export leads JSON" GET "/api/export/leads?format=json" $null $headers @(200)
Test-Endpoint "Export leads CSV" GET "/api/export/leads?format=csv" $null $headers @(200)

# Team
Write-Host "`n--- Team ---" -ForegroundColor Yellow
Test-Endpoint "List team" GET "/api/team" $null $headers @(200)

# Notifications
Write-Host "`n--- Notifications ---" -ForegroundColor Yellow
Test-Endpoint "List notifications" GET "/api/notifications" $null $headers @(200)

# Audit
Write-Host "`n--- Audit ---" -ForegroundColor Yellow
Test-Endpoint "List audit" GET "/api/audit" $null $headers @(200)

# Org
Write-Host "`n--- Organization ---" -ForegroundColor Yellow
Test-Endpoint "Get org" GET "/api/org" $null $headers @(200)

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
$total = $passed + $failed
Write-Host "  Total: $total | Passed: $passed | Failed: $failed" -ForegroundColor $(if($failed -eq 0){"Green"}else{"Yellow"})
Write-Host "================================`n" -ForegroundColor Cyan

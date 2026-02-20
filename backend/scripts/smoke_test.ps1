param(
    [string]$BaseUrl = 'http://127.0.0.1:5000',
    [string]$AdminUsername = 'admin',
    [string]$AdminPassword = 'adminpass',
    [string]$StudentUsername = '',
    [string]$StudentPassword = '',
    [switch]$SkipStudent,
    [int]$TimeoutSec = 20
)

$ErrorActionPreference = 'Stop'

$passed = 0
$failed = 0

function Pass([string]$name) {
    $script:passed++
    Write-Host "[PASS] $name" -ForegroundColor Green
}

function Fail([string]$name, [string]$detail) {
    $script:failed++
    Write-Host "[FAIL] $name - $detail" -ForegroundColor Red
}

function Warn([string]$msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Test-Step {
    param(
        [string]$Name,
        [scriptblock]$Action
    )

    try {
        & $Action
        Pass $Name
    }
    catch {
        Fail $Name $_.Exception.Message
    }
}

function Invoke-JsonApi {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [object]$Body = $null
    )

    $params = @{
        Method      = $Method
        Uri         = $Url
        TimeoutSec  = $TimeoutSec
        Headers     = $Headers
    }

    if ($null -ne $Body) {
        $params['ContentType'] = 'application/json'
        $params['Body'] = ($Body | ConvertTo-Json -Depth 10)
    }

    return Invoke-RestMethod @params
}

Write-Host "Running smoke tests against $BaseUrl" -ForegroundColor Cyan

$adminToken = $null
$adminUser = $null

Test-Step -Name 'Health endpoint' -Action {
    $health = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/health"
    if ($health.status -ne 'ok') {
        throw "Expected status=ok, got: $($health | ConvertTo-Json -Compress)"
    }
}

Test-Step -Name 'Admin login' -Action {
    $resp = Invoke-JsonApi -Method 'POST' -Url "$BaseUrl/login" -Body @{
        username = $AdminUsername
        password = $AdminPassword
    }

    if (-not $resp.auth_token) {
        throw 'No auth_token in login response'
    }

    $script:adminToken = $resp.auth_token
    $script:adminUser = $resp.user
}

if ($adminToken) {
    $adminHeaders = @{ Authorization = "Bearer $adminToken" }

    Test-Step -Name 'Repository list endpoint' -Action {
        $repo = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/admin/repository/questions?page=1&per_page=5" -Headers $adminHeaders
        if ($null -eq $repo.questions) {
            throw "Missing 'questions' in response"
        }
    }

    Test-Step -Name 'Repository metadata endpoint' -Action {
        $meta = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/api/metadata/repository" -Headers $adminHeaders
        if ($null -eq $meta.subjects -or $null -eq $meta.classes) {
            throw "Missing subjects/classes in metadata"
        }
    }

    Test-Step -Name 'Admin exams list endpoint' -Action {
        $exams = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/admin/exams" -Headers $adminHeaders
        if ($null -eq $exams.exams) {
            throw "Missing 'exams' in response"
        }
    }
}

$canRunStudent = $false
if (-not $SkipStudent) {
    if ([string]::IsNullOrWhiteSpace($StudentUsername) -or [string]::IsNullOrWhiteSpace($StudentPassword)) {
        Warn 'Student credentials not provided. Skipping student flow smoke tests.'
    }
    else {
        $canRunStudent = $true
    }
}

if ($canRunStudent) {
    $studentToken = $null
    $studentUserId = $null

    Test-Step -Name 'Student login' -Action {
        $resp = Invoke-JsonApi -Method 'POST' -Url "$BaseUrl/login" -Body @{
            username = $StudentUsername
            password = $StudentPassword
        }

        if (-not $resp.auth_token) {
            throw 'No auth_token in student login response'
        }

        $script:studentToken = $resp.auth_token
        $script:studentUserId = $resp.user.id
    }

    if ($studentToken) {
        $studentHeaders = @{ Authorization = "Bearer $studentToken" }
        $studentExamId = $null

        Test-Step -Name 'Student exams list endpoint' -Action {
            $resp = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/student/exams?page=1&per_page=5" -Headers $studentHeaders
            if ($null -eq $resp.exams) {
                throw "Missing 'exams' in student list response"
            }
            if ($resp.exams.Count -gt 0 -and $resp.exams[0].exam.id) {
                $script:studentExamId = $resp.exams[0].exam.id
            }
        }

        if ($studentExamId) {
            Test-Step -Name 'Student can_start endpoint' -Action {
                $resp = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/student/exams/$studentExamId/can_start" -Headers $studentHeaders
                if ($null -eq $resp.assigned -or $null -eq $resp.within_window) {
                    throw "Missing can_start fields"
                }
            }
        }
        else {
            Warn 'No assigned exam found for student. Skipping can_start check.'
        }

        if ($studentUserId) {
            Test-Step -Name 'Student analysis endpoint' -Action {
                $resp = Invoke-JsonApi -Method 'GET' -Url "$BaseUrl/student/analysis/$studentUserId" -Headers $studentHeaders
                if ($null -eq $resp.summary) {
                    throw "Missing 'summary' in analysis response"
                }
            }
        }
    }
}

Write-Host ''
Write-Host "Smoke test summary: Passed=$passed Failed=$failed" -ForegroundColor Cyan
if ($failed -gt 0) {
    exit 1
}
exit 0

param(
    [string]$BaseUrl = 'http://localhost:8080',
    [int]$WarmupRequests = 5,
    [int]$MeasuredRequests = 100
)

if (-not $env:VACATIME_ACCESS_TOKEN) {
    throw 'Set VACATIME_ACCESS_TOKEN to a valid access token.'
}

$uri = "$BaseUrl/api/vacations?search=PERF-&archived=false&page=0&size=100"
$headers = @{ Authorization = "Bearer $env:VACATIME_ACCESS_TOKEN" }
$latencies = [System.Collections.Generic.List[double]]::new()

for ($i = 0; $i -lt ($WarmupRequests + $MeasuredRequests); $i++) {
    $timer = [System.Diagnostics.Stopwatch]::StartNew()
    $null = Invoke-RestMethod -Uri $uri -Headers $headers
    $timer.Stop()
    if ($i -ge $WarmupRequests) {
        $latencies.Add($timer.Elapsed.TotalMilliseconds)
    }
}

$sorted = @($latencies | Sort-Object)
$p50 = $sorted[[math]::Ceiling(0.50 * $sorted.Count) - 1]
$p95 = $sorted[[math]::Ceiling(0.95 * $sorted.Count) - 1]
"samples=$($sorted.Count) p50_ms=$([math]::Round($p50, 1)) p95_ms=$([math]::Round($p95, 1))"

<?php
// Script to inject lawyer routes into api.php

$file = '/opt/influenceurs-tracker/laravel-api/routes/api.php';
$content = file_get_contents($file);

$marker = "    // ============================================================\n    // Q&A (forum questions scraped from expat sites)";

$lawyerRoutes = <<<'ROUTES'
    // ============================================================
    // Lawyers Directory (worldwide lawyer scraping)
    // ============================================================
    Route::prefix('lawyers')->middleware('role:admin')->group(function () {
        Route::get('/', [\App\Http\Controllers\LawyerDirectoryController::class, 'index']);
        Route::get('/stats', [\App\Http\Controllers\LawyerDirectoryController::class, 'stats']);
        Route::get('/countries', [\App\Http\Controllers\LawyerDirectoryController::class, 'countries']);
        Route::get('/sources', [\App\Http\Controllers\LawyerDirectoryController::class, 'sources']);
        Route::get('/export', [\App\Http\Controllers\LawyerDirectoryController::class, 'export']);
        Route::get('/{id}', [\App\Http\Controllers\LawyerDirectoryController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/scrape/{sourceSlug}', [\App\Http\Controllers\LawyerDirectoryController::class, 'scrape']);
        Route::post('/scrape-all', [\App\Http\Controllers\LawyerDirectoryController::class, 'scrapeAll']);
    });

ROUTES;

if (str_contains($content, "prefix('lawyers')")) {
    echo "Lawyer routes already exist\n";
} else {
    $content = str_replace($marker, $lawyerRoutes . "\n" . $marker, $content);
    file_put_contents($file, $content);
    echo "Lawyer routes injected successfully\n";
}

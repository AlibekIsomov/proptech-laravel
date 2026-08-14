<?php

namespace App\Jobs;

use App\Models\MaintenanceRequest;
use App\Services\ClaudeService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Yangi nosozlik arizasini AI bilan tahlil qilish: foto bo'lsa Vision orqali
 * work order (nima buzilgan, ehtiyot qismlar, taxminiy narx), bo'lmasa matndan
 * kategoriya/prioritet. Natija ai_* maydonlariga yoziladi — dispetcher
 * tasdiqlaydi, avtomatik hech narsa o'zgartirilmaydi.
 */
class AnalyzeMaintenanceRequest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $requestId) {}

    public function handle(ClaudeService $ai): void
    {
        $request = MaintenanceRequest::withoutGlobalScopes()->with('photos')->find($this->requestId);

        if (! $request || $request->ai_summary) {
            return;
        }

        $photoPath = $this->localPhotoPath($request->photos->first()?->photo_url);

        $result = $photoPath
            ? $ai->analyzeMaintenancePhoto($photoPath, $request->title, $request->description)
            : $ai->categorizeRequest($request->title, $request->description);

        if (empty($result)) {
            return;
        }

        $request->updateQuietly([
            'ai_category_suggested' => $result['category'] ?? null,
            'ai_priority_suggested' => $result['priority'] ?? null,
            'ai_summary' => $result['summary'] ?? null,
        ]);
    }

    /** photo_url ("/storage/maintenance/x.jpg") -> lokal fayl yo'li, topilmasa null. */
    private function localPhotoPath(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $rel = ltrim((string) parse_url($url, PHP_URL_PATH), '/');
        $path = storage_path('app/public/'.preg_replace('#^storage/#', '', $rel));

        return is_file($path) ? $path : null;
    }
}

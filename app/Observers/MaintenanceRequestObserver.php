<?php

namespace App\Observers;

use App\Jobs\AnalyzeMaintenanceRequest;
use App\Jobs\Telegram\NotifyResidentStatusChanged;
use App\Jobs\Telegram\NotifyVendorAssigned;
use App\Models\MaintenanceRequest;

class MaintenanceRequestObserver
{
    /** Yakunlangan ta'mir shu muddat ichida qaytsa — takror hisoblanadi */
    public const REPEAT_WINDOW_DAYS = 60;

    public function created(MaintenanceRequest $request): void
    {
        $this->detectRepeat($request);

        // AI tahlil — faqat jonli so'rovlarda (seeder/test/artisan emas).
        // afterResponse: foto ariza yaratilgandan KEYIN saqlanadi, shuning uchun
        // javob yuborilgach ishga tushiramiz (sync queue'da ham foto tayyor bo'ladi).
        if (! app()->runningInConsole()) {
            AnalyzeMaintenanceRequest::dispatch($request->id)->afterResponse();
        }

        if ($request->assigned_vendor_id) {
            NotifyVendorAssigned::dispatch($request->id);
        }
    }

    public function updated(MaintenanceRequest $request): void
    {
        if ($request->wasChanged('assigned_vendor_id') && $request->assigned_vendor_id) {
            NotifyVendorAssigned::dispatch($request->id);
        }

        if ($request->wasChanged('status')) {
            NotifyResidentStatusChanged::dispatch($request->id, $request->status);
        }

        // Ish yakunlandi yoki baho qo'yildi — usta reytingini yangilaymiz
        if ($request->assigned_vendor_id && $request->wasChanged(['status', 'resident_rating'])) {
            $request->assignedVendor()->withoutGlobalScopes()->first()?->recalculateRating();
        }
    }

    /**
     * Takroriy nosozlik: o'sha kvartira + o'sha kategoriya bo'yicha yaqinda
     * yakunlangan ta'mir topilsa, arizani unga bog'laydi va o'sha ta'mirni
     * bajargan usta reytingini qayta hisoblaydi. Hech kim shikoyat yozmasa ham
     * tizim kimning ishi qaytayotganini shu yerda "ko'radi".
     */
    private function detectRepeat(MaintenanceRequest $request): void
    {
        if (! $request->category || ! $request->apartment_id) {
            return;
        }

        $previous = MaintenanceRequest::withoutGlobalScopes()
            ->where('apartment_id', $request->apartment_id)
            ->where('category', $request->category)
            ->where('status', 'completed')
            ->whereNotNull('assigned_vendor_id')
            ->whereKeyNot($request->id)
            // created_at bilan solishtiramiz — seeder o'tmish sanalarini ham to'g'ri bog'laydi
            ->whereBetween('completed_at', [$request->created_at->subDays(self::REPEAT_WINDOW_DAYS), $request->created_at])
            ->latest('completed_at')
            ->first();

        if (! $previous) {
            return;
        }

        $request->repeat_of_id = $previous->id;
        $request->saveQuietly();

        $previous->assignedVendor()->withoutGlobalScopes()->first()?->recalculateRating();
    }
}

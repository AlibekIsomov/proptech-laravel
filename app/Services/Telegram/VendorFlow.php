<?php

namespace App\Services\Telegram;

use App\Models\MaintenanceRequest;
use App\Models\TelegramSession;
use App\Models\Vendor;

/**
 * Pudratchi (vendor) uchun bot suhbati: menyu, biriktirilgan
 * topshiriqlar ro'yxati va holatni o'zgartirish.
 */
class VendorFlow
{
    public function __construct(
        protected TelegramSession $session,
        protected TelegramBotApi $api,
    ) {}

    protected function chatId(): string
    {
        return $this->session->chat_id;
    }

    protected function vendor(): ?Vendor
    {
        if (! $this->session->vendor_id) {
            return null;
        }

        return Vendor::find($this->session->vendor_id);
    }

    public function sendMenu(): void
    {
        $vendor = $this->vendor();

        if (! $vendor) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $openCount = MaintenanceRequest::where('assigned_vendor_id', $vendor->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->count();

        $text = "👋 Salom, <b>{$vendor->name}</b>!\n\n";
        $text .= $openCount > 0
            ? "🔧 Sizda {$openCount} ta faol topshiriq bor."
            : "✅ Hozircha faol topshiriqlar yo'q.";

        $this->resetState();

        $canSwitchToResident = $this->session->active_resident_id !== null;
        $this->api->sendMessage($this->chatId(), $text, Keyboards::vendorMenu($canSwitchToResident));
    }

    public function listAssignedRequests(): void
    {
        $vendor = $this->vendor();

        if (! $vendor) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $requests = MaintenanceRequest::with('apartment')
            ->where('assigned_vendor_id', $vendor->id)
            ->whereIn('status', ['assigned', 'in_progress'])
            ->orderByRaw("CASE priority WHEN 'emergency' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END")
            ->orderBy('created_at')
            ->limit(10)
            ->get();

        if ($requests->isEmpty()) {
            $this->api->sendMessage($this->chatId(), "✅ Hozircha sizga biriktirilgan faol topshiriqlar yo'q.");
            return;
        }

        foreach ($requests as $request) {
            $this->sendRequestCard($request);
        }
    }

    public function showRequest(string $requestId): void
    {
        $vendor = $this->vendor();

        if (! $vendor) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $request = MaintenanceRequest::with('apartment')
            ->where('assigned_vendor_id', $vendor->id)
            ->find($requestId);

        if (! $request) {
            $this->api->sendMessage($this->chatId(), 'Topshiriq topilmadi.');
            return;
        }

        $this->sendRequestCard($request);
    }

    protected function sendRequestCard(MaintenanceRequest $request): void
    {
        $apartment = $request->apartment;

        $lines = [
            Keyboards::priorityLabel($request->priority).' · '.Keyboards::statusLabel($request->status),
            "<b>{$request->title}</b>",
        ];

        if ($request->description) {
            $lines[] = $request->description;
        }
        if ($apartment) {
            $lines[] = "🏠 Kvartira №{$apartment->number}";
        }
        $lines[] = '📂 '.Keyboards::categoryLabel($request->category);

        $this->api->sendMessage(
            $this->chatId(),
            implode("\n", $lines),
            Keyboards::requestActionsKeyboard($request->id, $request->status)
        );
    }

    /** Pudratchi murojaat holatini o'zgartiradi (assigned -> in_progress -> completed). */
    public function updateStatus(string $requestId, string $newStatus): void
    {
        $vendor = $this->vendor();

        if (! $vendor) {
            $this->api->sendMessage($this->chatId(), 'Xatolik yuz berdi. /start ni qayta yuboring.');
            return;
        }

        $request = MaintenanceRequest::where('assigned_vendor_id', $vendor->id)->find($requestId);

        if (! $request) {
            $this->api->sendMessage($this->chatId(), 'Topshiriq topilmadi.');
            return;
        }

        $allowed = [
            'assigned' => 'in_progress',
            'in_progress' => 'completed',
        ];

        if (($allowed[$request->status] ?? null) !== $newStatus) {
            $this->api->sendMessage($this->chatId(), "Bu amalni bajarib bo'lmaydi.");
            return;
        }

        $request->status = $newStatus;

        if ($newStatus === 'in_progress' && ! $request->started_at) {
            $request->started_at = now();
        }
        if ($newStatus === 'completed' && ! $request->completed_at) {
            $request->completed_at = now();
        }

        $request->save();

        $message = $newStatus === 'in_progress'
            ? "▶️ \"{$request->title}\" ish boshlandi deb belgilandi."
            : "✅ \"{$request->title}\" bajarildi deb belgilandi.";

        $this->api->sendMessage($this->chatId(), $message);
        $this->sendRequestCard($request->refresh());
    }

    protected function resetState(): void
    {
        $this->session->state = 'idle';
        $this->session->context = null;
        $this->session->save();
    }
}

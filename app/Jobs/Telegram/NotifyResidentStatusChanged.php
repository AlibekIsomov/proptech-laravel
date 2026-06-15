<?php

namespace App\Jobs\Telegram;

use App\Models\MaintenanceRequest;
use App\Services\Telegram\Keyboards;
use App\Services\Telegram\TelegramBotApi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/** Murojaat holati o'zgarganda, rezidentga botda xabar yuborish. */
class NotifyResidentStatusChanged implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $requestId, public string $status)
    {
    }

    public function handle(TelegramBotApi $api): void
    {
        // Yangi yaratilganda ('open') xabar yubormaymiz — buni rezident o'zi bilib turadi.
        if ($this->status === 'open') {
            return;
        }

        $request = MaintenanceRequest::with('resident')->find($this->requestId);
        $resident = $request?->resident;

        if (! $request || ! $resident || ! $resident->telegram_chat_id) {
            return;
        }

        $text = "ℹ️ Murojaatingiz holati o'zgardi:\n\n"
            ."<b>{$request->title}</b>\n"
            .Keyboards::statusLabel($this->status);

        $api->sendMessage($resident->telegram_chat_id, $text);
    }
}

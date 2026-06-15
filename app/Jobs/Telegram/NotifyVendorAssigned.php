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

/** Murojaat pudratchiga biriktirilganda, pudratchiga botda xabar yuborish. */
class NotifyVendorAssigned implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $requestId)
    {
    }

    public function handle(TelegramBotApi $api): void
    {
        $request = MaintenanceRequest::with(['apartment', 'assignedVendor'])->find($this->requestId);
        $vendor = $request?->assignedVendor;

        if (! $request || ! $vendor || ! $vendor->telegram_chat_id) {
            return;
        }

        $lines = [
            '🆕 <b>Sizga yangi topshiriq biriktirildi!</b>',
            '',
            Keyboards::priorityLabel($request->priority).' · '.Keyboards::categoryLabel($request->category),
            "<b>{$request->title}</b>",
        ];

        if ($request->description) {
            $lines[] = $request->description;
        }

        if ($request->apartment) {
            $lines[] = "🏠 Kvartira №{$request->apartment->number}";
        }

        $api->sendMessage(
            $vendor->telegram_chat_id,
            implode("\n", $lines),
            Keyboards::requestActionsKeyboard($request->id, $request->status)
        );
    }
}

<?php

namespace App\Jobs\Telegram;

use App\Models\CityReport;
use App\Services\Telegram\TelegramBotApi;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

/**
 * Yangi Mahalla Fix murojaati yaratilganda uni kommunal xizmat kanaliga (Admin View)
 * rasm + ticket + xarita havolasi bilan yuborish. Mahalla Fix boti orqali ketadi.
 */
class NotifyCityReportCreated implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public string $reportId)
    {
    }

    public function handle(): void
    {
        $report = CityReport::find($this->reportId);
        $channel = config('services.telegram.mahalla.reports_channel');

        if (! $report || ! $channel) {
            return;
        }

        $lat = $report->latitude;
        $lng = $report->longitude;
        $mapUrl = "https://www.openstreetmap.org/?mlat={$lat}&mlon={$lng}#map=18/{$lat}/{$lng}";

        $lines = array_filter([
            "🆕 <b>Yangi murojaat</b> · <code>{$report->ticket_code}</code>",
            CityReport::categoryLabel($report->category).' · '.CityReport::priorityLabel($report->priority),
            "<b>".e($report->title)."</b>",
            $report->ai_summary ? e($report->ai_summary) : null,
            $report->description ? '💬 '.e($report->description) : null,
            "📍 <a href=\"{$mapUrl}\">Xaritada ochish</a>",
            $report->reporter_name ? '👤 '.e($report->reporter_name) : null,
        ]);

        $caption = implode("\n", $lines);
        $api = TelegramBotApi::mahalla();

        $photoUrl = $report->photo_path
            ? rtrim((string) config('app.url'), '/').Storage::url($report->photo_path)
            : null;

        if ($photoUrl) {
            $api->sendPhoto($channel, $photoUrl, $caption);
        } else {
            $api->sendMessage($channel, $caption);
        }
    }
}

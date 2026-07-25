<?php

namespace App\Console\Commands;

use App\Models\CityReport;
use App\Services\ClaudeService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class MahallaReanalyze extends Command
{
    protected $signature = 'mahalla:reanalyze
        {--id= : Faqat shu ID li murojaatni qayta tahlil qilish}
        {--force : Tahlil qilinganlarni ham qaytadan tahlil qilish}
        {--limit=0 : Nechta murojaatni qayta ishlash (0 = cheksiz)}
        {--dry-run : Hech narsani saqlamasdan, faqat nima o\'zgarishini ko\'rsatish}';

    protected $description = "Mahalla Fix — AI tahlil qilinmay qolgan (yoki --force bilan hammasi) murojaatlarni saqlangan foto bo'yicha qayta tahlil qilish";

    /** analyzeImage() fallback tavsifining boshlanishi — "tahlil qilinmagan" belgisi. */
    protected const FALLBACK_SUMMARY_PREFIX = 'Rasm avtomatik tahlil qilinmadi';

    public function handle(ClaudeService $ai): int
    {
        $query = CityReport::query()->whereNotNull('photo_path');

        if ($id = $this->option('id')) {
            $query->whereKey($id);
        } elseif (! $this->option('force')) {
            // Faqat tahlil qilinmaganlar: ai_summary yo'q yoki fallback matnli
            $query->where(fn ($q) => $q
                ->whereNull('ai_summary')
                ->orWhere('ai_summary', 'like', self::FALLBACK_SUMMARY_PREFIX.'%'));
        }

        if (($limit = (int) $this->option('limit')) > 0) {
            $query->limit($limit);
        }

        $reports = $query->orderBy('created_at')->get();

        if ($reports->isEmpty()) {
            $this->info('Qayta tahlil qilinadigan murojaat topilmadi.');

            return self::SUCCESS;
        }

        $this->info("{$reports->count()} ta murojaat qayta tahlil qilinadi...");
        $dryRun = (bool) $this->option('dry-run');
        $done = 0;
        $skipped = 0;

        foreach ($reports as $report) {
            $absPath = Storage::disk('public')->path($report->photo_path);

            if (! is_file($absPath)) {
                $this->warn("  ⊘ {$report->ticket_code}: foto fayli topilmadi ({$report->photo_path})");
                $skipped++;

                continue;
            }

            $mime = $this->guessMime($absPath);
            $analysis = $ai->analyzeImage($absPath, $mime);

            // Kalit yo'q bo'lsa yana fallback qaytadi — bunda saqlamaymiz (foydasi yo'q)
            if (str_starts_with($analysis['summary'] ?? '', self::FALLBACK_SUMMARY_PREFIX)) {
                $this->warn("  ⊘ {$report->ticket_code}: AI hali javob bermadi (ANTHROPIC_API_KEY tekshiring).");
                $skipped++;

                continue;
            }

            $updates = [
                'ai_category' => $analysis['category'] ?? null,
                'ai_priority' => $analysis['priority'] ?? null,
                'ai_summary'  => $analysis['summary'] ?? null,
            ];

            // Ko'rinadigan maydonlarni faqat fallback qoldiqlari bo'lsa yangilaymiz
            // (foydalanuvchi qo'lda tanlagan kategoriya/sarlavhani buzmaslik uchun)
            if ($report->category === 'other') {
                $updates['category'] = $analysis['category'] ?? 'other';
            }
            if ($report->title === null || $report->title === 'Infratuzilma muammosi') {
                $updates['title'] = $analysis['title'] ?? $report->title;
            }
            $updates['priority'] = $analysis['priority'] ?? $report->priority;

            $this->line("  ✓ {$report->ticket_code}: ".($updates['ai_category'] ?? '?').' — '.\Illuminate\Support\Str::limit($updates['ai_summary'] ?? '', 60));

            if (! $dryRun) {
                $report->update($updates);
            }

            $done++;
        }

        $this->newLine();
        $this->info(($dryRun ? '[dry-run] ' : '')."Tugadi: {$done} ta tahlil qilindi, {$skipped} ta o'tkazib yuborildi.");

        return self::SUCCESS;
    }

    protected function guessMime(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            'gif'         => 'image/gif',
            'jpg', 'jpeg' => 'image/jpeg',
            default       => 'image/jpeg',
        };
    }
}

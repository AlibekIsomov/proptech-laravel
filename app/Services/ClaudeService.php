<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClaudeService
{
    private string $apiKey;
    private string $model;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.key', '');
        $this->model  = (string) config('services.anthropic.model', 'claude-sonnet-4-0');
    }

    public function complete(string $prompt, int $maxTokens = 1024): string
    {
        if (empty($this->apiKey)) {
            if (str_contains($prompt, "AI tavsifi") || str_contains($prompt, "JSON formatda javob bering")) {
                return '{
                  "category": "plumbing",
                  "priority": "medium",
                  "summary": "Suv sizishi aniqlandi. Muammoni bartaraf etish kerak."
                }';
            }
            if (str_contains($prompt, "AI konsultantisiz") || str_contains($prompt, "savdo ma'lumotlariga asoslanib")) {
                return "• Reklama kampaniyalarini kuchaytiring va maqsadli auditoriyani kengaytiring.\n• Mijozlarga qulay va moslashuvchan muddatli to'lov variantlarini taklif qiling.\n• Mavjud kvartiralarni tezroq sotish uchun maxsus aksiyalar e'lon qiling.";
            }
            if (str_contains($prompt, "professional email yozing")) {
                return "Mavzu: Qiziqarli taklif\n\nHurmatli mijoz! Biz siz uchun eng qulay shartlar va ajoyib taklifni tayyorladik.";
            }
            return 'AI vaqtincha mock rejimida ishlamoqda.';
        }

        try {
            $response = Http::withHeaders([
                'x-api-key'         => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type'      => 'application/json',
            ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
                'model'      => $this->model,
                'max_tokens' => $maxTokens,
                'messages'   => [['role' => 'user', 'content' => $prompt]],
            ]);

            if ($response->failed()) {
                Log::error('Claude API error', ['status' => $response->status(), 'body' => $response->body()]);
                return 'AI vaqtincha mavjud emas.';
            }

            return $response->json('content.0.text', '');
        } catch (\Throwable $e) {
            Log::error('Claude service exception', ['message' => $e->getMessage()]);
            return 'AI vaqtincha mavjud emas.';
        }
    }

    /**
     * Nosozlik arizasini kategoriya va prioritet bo'yicha tahlil qilish.
     */
    public function categorizeRequest(string $title, string $description): array
    {
        $prompt = <<<PROMPT
Siz mulk boshqaruvi tizimining AI assistantsiz. Quyidagi nosozlik arizasini tahlil qiling va JSON javob bering.

Ariza sarlavhasi: {$title}
Tavsif: {$description}

Quyidagi JSON formatda javob bering (boshqa hech narsa yozmang):
{
  "category": "plumbing|electrical|heating|cleaning|elevator|appliance|structural|other",
  "priority": "low|medium|high|emergency",
  "summary": "Qisqa AI tavsifi (o'zbek tilida, 1-2 jumla)"
}
PROMPT;

        $json = $this->complete($prompt, 256);

        try {
            // JSON-ni extract qilamiz
            preg_match('/\{.*\}/s', $json, $matches);
            return json_decode($matches[0] ?? '{}', true) ?? [];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Mahalla Fix — rasmdan shahar infratuzilma muammosini aniqlash (Vision).
     *
     * @return array{category:string, priority:string, title:string, summary:string}
     */
    public function analyzeImage(string $absoluteImagePath, string $mimeType = 'image/jpeg'): array
    {
        $fallback = [
            'category' => 'other',
            'priority' => 'medium',
            'title'    => 'Infratuzilma muammosi',
            'summary'  => 'Rasm avtomatik tahlil qilinmadi. Iltimos, muammoni qo\'lda tekshiring.',
        ];

        if (empty($this->apiKey) || ! is_file($absoluteImagePath)) {
            return $fallback;
        }

        $prompt = <<<'PROMPT'
Siz shahar va mahalla infratuzilma muammolarini aniqlaydigan AI assistantsiz. Rasmni tahlil qiling
va faqat quyidagi JSON formatda javob bering (boshqa hech narsa yozmang):
{
  "category": "pothole|street_light|water_leak|gas_leak|garbage|other",
  "priority": "low|medium|high|emergency",
  "title": "Qisqa sarlavha (o'zbek tilida, 3-6 so'z)",
  "summary": "Rasmiy va tushunarli 1-2 jumlalik tavsif (o'zbek tilida)"
}
category izohi: pothole=yo'l teshigi/nuqsoni, street_light=buzuq ko'cha chirog'i,
water_leak=suv sizishi/quvur, gas_leak=gaz sizishi, garbage=chiqindi/axlat, other=boshqa.
PROMPT;

        try {
            $base64 = base64_encode((string) file_get_contents($absoluteImagePath));

            $response = Http::withHeaders([
                'x-api-key'         => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type'      => 'application/json',
            ])->timeout(45)->post('https://api.anthropic.com/v1/messages', [
                'model'      => $this->model,
                'max_tokens' => 512,
                'messages'   => [[
                    'role'    => 'user',
                    'content' => [
                        ['type' => 'image', 'source' => [
                            'type'       => 'base64',
                            'media_type' => $mimeType,
                            'data'       => $base64,
                        ]],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ]],
            ]);

            if ($response->failed()) {
                Log::error('Claude vision API error', ['status' => $response->status(), 'body' => $response->body()]);

                return $fallback;
            }

            $text = (string) $response->json('content.0.text', '');
            preg_match('/\{.*\}/s', $text, $matches);
            $parsed = json_decode($matches[0] ?? '{}', true);

            if (! is_array($parsed)) {
                return $fallback;
            }

            return array_merge($fallback, array_filter([
                'category' => $parsed['category'] ?? null,
                'priority' => $parsed['priority'] ?? null,
                'title'    => $parsed['title'] ?? null,
                'summary'  => $parsed['summary'] ?? null,
            ]));
        } catch (\Throwable $e) {
            Log::error('Claude vision exception', ['message' => $e->getMessage()]);

            return $fallback;
        }
    }

    /**
     * Email matn generatsiyasi.
     */
    public function generateEmail(string $clientName, string $apartmentInfo, string $context): string
    {
        $prompt = <<<PROMPT
Siz mulk sotuvchisisiz. Quyidagi mijoz uchun professional email yozing.

Mijoz: {$clientName}
Kvartira: {$apartmentInfo}
Qo'shimcha kontekst: {$context}

Faqat email matnini yozing (sarlavha + tana). O'zbek va rus tilida aralash yozing.
PROMPT;

        return $this->complete($prompt, 512);
    }
}

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
        $this->model = (string) config('services.anthropic.model', 'claude-sonnet-4-0');
    }

    public function complete(string $prompt, int $maxTokens = 1024): string
    {
        if (empty($this->apiKey)) {
            if (str_contains($prompt, 'AI tavsifi') || str_contains($prompt, 'JSON formatda javob bering')) {
                return '{
                  "category": "plumbing",
                  "priority": "medium",
                  "summary": "Suv sizishi aniqlandi. Muammoni bartaraf etish kerak."
                }';
            }
            if (str_contains($prompt, 'AI konsultantisiz') || str_contains($prompt, "savdo ma'lumotlariga asoslanib")) {
                return "• Reklama kampaniyalarini kuchaytiring va maqsadli auditoriyani kengaytiring.\n• Mijozlarga qulay va moslashuvchan muddatli to'lov variantlarini taklif qiling.\n• Mavjud kvartiralarni tezroq sotish uchun maxsus aksiyalar e'lon qiling.";
            }
            if (str_contains($prompt, 'professional email yozing')) {
                return "Mavzu: Qiziqarli taklif\n\nHurmatli mijoz! Biz siz uchun eng qulay shartlar va ajoyib taklifni tayyorladik.";
            }

            return 'AI vaqtincha mock rejimida ishlamoqda.';
        }

        try {
            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout(30)->post('https://api.anthropic.com/v1/messages', [
                'model' => $this->model,
                'max_tokens' => $maxTokens,
                'messages' => [['role' => 'user', 'content' => $prompt]],
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
     * @return array{category?:string, priority?:string, title?:string, summary?:string}
     *                                                                                   AI javob bermasa bo'sh massiv — chaqiruvchi o'zi fallback qo'yadi.
     */
    public function analyzeImage(string $absoluteImagePath, string $mimeType = 'image/jpeg'): array
    {
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

        return $this->visionJson($absoluteImagePath, $mimeType, $prompt, ['category', 'priority', 'title', 'summary']);
    }

    /**
     * Nosozlik arizasi fotosidan work order yozish: nima buzilgan, muhimlik,
     * kerakli ehtiyot qismlar va taxminiy narx. Aholi hech narsa to'ldirmasa ham
     * dispetcher tayyor ma'lumot ko'radi.
     *
     * @return array{category?:string, priority?:string, summary?:string}
     *                                                                    AI javob bermasa bo'sh massiv — ai_* maydonlari tegilmaydi, keyin qayta urinsa bo'ladi.
     */
    public function analyzeMaintenancePhoto(string $absoluteImagePath, string $title, string $description, string $mimeType = 'image/jpeg'): array
    {
        $prompt = <<<PROMPT
Siz turar-joy binolari texnik xizmati AI assistantsiz. Yashovchi nosozlik fotosini yubordi.
Rasmni tahlil qilib work order (ish topshirig'i) tuzing.

Yashovchi yozgani — sarlavha: "{$title}", tavsif: "{$description}"

Faqat quyidagi JSON formatda javob bering (boshqa hech narsa yozmang):
{
  "category": "plumbing|electrical|heating|cleaning|elevator|appliance|structural|other",
  "priority": "low|medium|high|emergency",
  "summary": "Work order (o'zbek tilida, 2-4 jumla): nima buzilgan, kerakli ehtiyot qismlar va taxminiy narx (UZS)"
}
PROMPT;

        return $this->visionJson($absoluteImagePath, $mimeType, $prompt, ['category', 'priority', 'summary']);
    }

    /**
     * Umumiy Vision so'rovi: rasm + prompt -> JSON maydonlar.
     *
     * Muvaffaqiyatsizlikda (kalit yo'q, fayl yo'q, API xatosi) bo'sh massiv qaytaradi —
     * "AI javob bermadi"ni "AI shunday dedi"dan ajratish uchun. Chaqiruvchi bo'sh natijani
     * saqlamasligi kerak, aks holda keyin qayta tahlil qilish imkoni yo'qoladi.
     *
     * @param  list<string>  $fields  javobdan olinadigan kalitlar
     */
    protected function visionJson(string $absoluteImagePath, string $mimeType, string $prompt, array $fields): array
    {
        if (empty($this->apiKey) || ! is_file($absoluteImagePath)) {
            return [];
        }

        try {
            // Rasmni Claude limitlariga moslash: kichraytirish + JPEG'ga normallashtirish.
            // Bu telefon fotolaridagi katta hajm / HEIC-ga o'xshash format / media_type
            // mos emasligi sabab bo'ladigan 400 xatolarni oldini oladi.
            [$base64, $mediaType] = $this->prepareImageForVision($absoluteImagePath, $mimeType);

            $response = Http::withHeaders([
                'x-api-key' => $this->apiKey,
                'anthropic-version' => '2023-06-01',
                'Content-Type' => 'application/json',
            ])->timeout(45)->post('https://api.anthropic.com/v1/messages', [
                'model' => $this->model,
                'max_tokens' => 512,
                'messages' => [[
                    'role' => 'user',
                    'content' => [
                        ['type' => 'image', 'source' => [
                            'type' => 'base64',
                            'media_type' => $mediaType,
                            'data' => $base64,
                        ]],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ]],
            ]);

            if ($response->failed()) {
                Log::error('Claude vision API error', ['status' => $response->status(), 'body' => $response->body()]);

                return [];
            }

            $text = (string) $response->json('content.0.text', '');
            preg_match('/\{.*\}/s', $text, $matches);
            $parsed = json_decode($matches[0] ?? '{}', true);

            if (! is_array($parsed)) {
                return [];
            }

            $result = [];
            foreach ($fields as $field) {
                $result[$field] = $parsed[$field] ?? null;
            }

            return array_filter($result);
        } catch (\Throwable $e) {
            Log::error('Claude vision exception', ['message' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * Rasmni Vision API uchun tayyorlash: uzun tomonini 1568px gacha kichraytirib,
     * JPEG'ga qayta kodlaydi. GD o'qiy olmasa — asl baytlarni qaytaradi.
     *
     * @return array{0: string, 1: string} [base64, media_type]
     */
    protected function prepareImageForVision(string $path, string $fallbackMime): array
    {
        $raw = (string) file_get_contents($path);

        if (! function_exists('imagecreatefromstring')) {
            return [base64_encode($raw), $fallbackMime];
        }

        try {
            $img = @imagecreatefromstring($raw);

            if ($img === false) {
                return [base64_encode($raw), $fallbackMime];
            }

            $width = imagesx($img);
            $height = imagesy($img);
            $max = 1568;

            if (max($width, $height) > $max) {
                $scaled = imagescale($img, (int) round($width * ($max / max($width, $height))));

                if ($scaled !== false) {
                    imagedestroy($img);
                    $img = $scaled;
                }
            }

            ob_start();
            $ok = imagejpeg($img, null, 82);
            $jpeg = (string) ob_get_clean();
            imagedestroy($img);

            if (! $ok || $jpeg === '') {
                return [base64_encode($raw), $fallbackMime];
            }

            return [base64_encode($jpeg), 'image/jpeg'];
        } catch (\Throwable $e) {
            Log::warning('Vision image normalize failed', ['message' => $e->getMessage()]);

            return [base64_encode($raw), $fallbackMime];
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

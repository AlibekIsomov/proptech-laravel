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
        $this->apiKey = config('services.anthropic.key', '');
        $this->model  = config('services.anthropic.model', 'claude-sonnet-4-0');
    }

    /**
     * Oddiy text so'rov.
     */
    public function complete(string $prompt, int $maxTokens = 1024): string
    {
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

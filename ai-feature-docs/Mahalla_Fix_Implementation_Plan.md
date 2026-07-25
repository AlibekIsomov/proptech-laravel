# Mahalla Fix — Implementatsiya Rejasi

> TZ: `Mahalla_Fix_TZ.pdf` · Kod: TZ-SMART-13 · Platforma: Telegram Mini App
> Qarorlar: **alohida `city_reports` modul** + **har qanday Telegram foydalanuvchi** + **Claude Vision**
> + **ALOHIDA sahifa** (`/mahalla-fix`, TelegramApp tab'i emas) + **ALOHIDA Telegram bot**

## ✅ IMPLEMENTATSIYA HOLATI (yakuniy arxitektura)

Quyidagilar qurildi. Aholi/Pudratchi botidan to'liq ajratilgan:

- **Alohida bot**: `TELEGRAM_MAHALLA_*` config, `TelegramBotApi::mahalla()`, o'z webhook'i
  (`/mahalla-fix/webhook`) va setup komandasi (`php artisan mahalla:setup <url>`).
- **Alohida sahifa**: `GET /mahalla-fix` → `Pages/MahallaFix/App.tsx` (o'z api client'i, o'z auth
  middleware'i `AuthenticateMahallaWebApp` — Mahalla bot tokeni bilan validatsiya, TelegramSession'siz).
- **Yaratilgan fayllar**: migration + `CityReport` model, `ClaudeService::analyzeImage` (Vision),
  `Telegram/MahallaFix/{CityReportController,WebhookController}`, `Jobs/Telegram/NotifyCityReportCreated`,
  `PM/CityReportController` + `Pages/PM/CityReports/{Index,Show}.tsx`, Leaflet xarita komponentlari,
  `MahallaBotSetup` komandasi, feature test `MahallaFixApiTest`.

**⏳ Qolgan qadam (lokalda PHP/Docker yo'q edi):** `php artisan migrate` + `php artisan test` Docker orqali.
Frontend `npm run build` muvaffaqiyatli o'tdi.

---


Bu reja mavjud loyiha namunalariga (`MaintenanceRequest`, `TelegramBotApi`, `ClaudeService`,
`AuthenticateWebApp`, PM CRUD) tayanadi. Yangi provider yoki auth mexanizmi qo'shilmaydi.

---

## 0. Asosiy arxitektura qarori

Mavjud `MaintenanceRequest` — bu **ro'yxatdan o'tgan aholining kvartirasidagi** nosozlik
(`apartment_id`, `building_id`, `resident_id` majburiy). Mahalla Fix esa **istalgan fuqaroning
jamoat/ko'cha muammosi** — kvartiraga emas, **GPS koordinatasiga** bog'lanadi. Shu sabab alohida
`city_reports` jadvali/modeli quriladi. Qayta ishlatiladigan narsalar: Telegram WebApp auth,
foto storage, AI service, notify Job namunasi, PM admin CRUD namunasi.

Statuslar (TZ: "Yuborildi / Jarayonda / Hal etildi"):
`submitted` → `in_progress` → `resolved` (+ `rejected` ixtiyoriy).

---

## 1. Ma'lumotlar bazasi

### Fayl: `database/migrations/2026_07_25_100000_create_city_reports_table.php` (yangi)

Loyiha uslubi: Postgres, UUID PK `gen_random_uuid()`, `foreignId('company_id')->constrained()`.

```php
Schema::create('city_reports', function (Blueprint $table) {
    $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
    $table->string('ticket_code')->unique();              // MF-2026-000123
    $table->foreignId('company_id')->nullable()->constrained()->nullOnDelete();

    // Murojaat qiluvchi (ro'yxatdan o'tish shart emas — Telegram identifikatori)
    $table->string('reporter_telegram_id')->index();
    $table->string('reporter_name')->nullable();
    $table->string('reporter_username')->nullable();

    // Geolokatsiya (TZ: GPS + xarita)
    $table->decimal('latitude', 10, 7);
    $table->decimal('longitude', 10, 7);
    $table->string('address')->nullable();                // reverse-geocode natijasi (ixtiyoriy)

    // Muammo tavsifi
    $table->string('category');                           // pothole|street_light|water_leak|gas_leak|garbage|other
    $table->string('priority')->default('medium');        // low|medium|high|emergency
    $table->string('title')->nullable();
    $table->text('description')->nullable();              // foydalanuvchi izohi

    // AI natijasi
    $table->string('ai_category')->nullable();
    $table->string('ai_priority')->nullable();
    $table->text('ai_summary')->nullable();

    $table->string('photo_path')->nullable();             // storage/public yo'li
    $table->string('status')->default('submitted');       // submitted|in_progress|resolved|rejected
    $table->text('resolution_notes')->nullable();
    $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('resolved_at')->nullable();

    $table->timestamps();
});
```

**Eslatma:** `company_id` nullable — chunki xabar bergan fuqaro qaysi kompaniyaga tegishli
ekani boshida noma'lum bo'lishi mumkin. Rejalashtirilgan yondashuv: `LANDING`/default kompaniya
yoki koordinata bo'yicha bino/mahalla topilsa biriktiriladi. MVP uchun `nullable` yetarli.

---

## 2. Model

### Fayl: `app/Models/CityReport.php` (yangi)

`MaintenanceRequest` namunasidan: `HasUuids`. **CompanyScope QO'SHILMAYDI** — chunki
murojaatlarni Telegram sessiya (auth() yo'q) yaratadi va admin barcha murojaatlarni ko'radi.
Kompaniya filtrini admin controllerda qo'lda qo'llaymiz.

```php
class CityReport extends Model
{
    use HasUuids;

    protected $fillable = [
        'ticket_code', 'company_id',
        'reporter_telegram_id', 'reporter_name', 'reporter_username',
        'latitude', 'longitude', 'address',
        'category', 'priority', 'title', 'description',
        'ai_category', 'ai_priority', 'ai_summary',
        'photo_path', 'status', 'resolution_notes', 'handled_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'resolved_at' => 'datetime',
        ];
    }

    // Ticket kodini avto-generatsiya: MF-2026-000123
    protected static function booted(): void
    {
        static::creating(function (CityReport $r) {
            if (empty($r->ticket_code)) {
                $r->ticket_code = 'MF-'.now()->year.'-'.str_pad((string) random_int(1, 999999), 6, '0', STR_PAD_LEFT);
            }
        });
    }

    // Kategoriya/status labellari (Uzbek) — CATEGORY_LABELS, STATUS_LABELS const + helperlar
    public function handledBy(): BelongsTo { return $this->belongsTo(User::class, 'handled_by'); }
}
```

Kategoriya labellari (Uzbek, TZ misollariga mos):
`pothole`→"Yo'l teshigi", `street_light`→"Ko'cha chirog'i", `water_leak`→"Suv sizishi",
`gas_leak`→"Gaz sizishi", `garbage`→"Chiqindi", `other`→"Boshqa".

---

## 3. Backend — Vision AI

### Fayl: `app/Services/ClaudeService.php` (o'zgartirish)

Yangi metod `analyzeImage()` qo'shiladi. Claude vision `image` content block'ni base64 orqali
qabul qiladi. `complete()`dagi mavjud mock-fallback uslubi saqlanadi (API kaliti bo'lmasa).

```php
/**
 * Rasmdan shahar infratuzilma muammosini aniqlash (Vision).
 * @return array{category:string, priority:string, summary:string, title:string}
 */
public function analyzeImage(string $absoluteImagePath, string $mimeType = 'image/jpeg'): array
{
    if (empty($this->apiKey) || ! is_file($absoluteImagePath)) {
        return [
            'category' => 'other', 'priority' => 'medium',
            'title' => 'Infratuzilma muammosi',
            'summary' => 'Rasm avtomatik tahlil qilinmadi (AI mock rejimi).',
        ];
    }

    $base64 = base64_encode(file_get_contents($absoluteImagePath));

    $prompt = <<<PROMPT
    Siz shahar infratuzilma muammolarini aniqlaydigan AI assistantsiz. Rasmni tahlil qiling.
    Faqat JSON qaytaring:
    {
      "category": "pothole|street_light|water_leak|gas_leak|garbage|other",
      "priority": "low|medium|high|emergency",
      "title": "Qisqa sarlavha (o'zbek tilida)",
      "summary": "Rasmiy, tushunarli 1-2 jumlalik tavsif (o'zbek tilida)"
    }
    PROMPT;

    $response = Http::withHeaders([...])->timeout(45)->post('.../v1/messages', [
        'model' => $this->model,
        'max_tokens' => 512,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'image', 'source' => [
                    'type' => 'base64', 'media_type' => $mimeType, 'data' => $base64,
                ]],
                ['type' => 'text', 'text' => $prompt],
            ],
        ]],
    ]);

    // JSON extract (categorizeRequest'dagi kabi preg_match '/\{.*\}/s')
}
```

**Model eslatma:** vision uchun `services.anthropic.model` `claude-sonnet-4-0` yetarli
(vision qo'llab-quvvatlaydi). O'zgartirish shart emas.

---

## 4. Backend — Controller + Route

### Fayl: `app/Http/Controllers/Telegram/WebApp/CityReportController.php` (yangi)

`ResolvesTelegramSession` trait ishlatiladi. **Resident tekshiruvi YO'Q** — har qanday
Telegram sessiya murojaat bera oladi.

```php
class CityReportController extends Controller
{
    use ResolvesTelegramSession;

    // GET /city-reports — shu foydalanuvchining o'z murojaatlari
    public function index(Request $request): JsonResponse
    {
        $session = $this->session($request);
        $reports = CityReport::where('reporter_telegram_id', (string) $session->telegram_user_id)
            ->orderByDesc('created_at')->get()->map(fn ($r) => $this->transform($r));
        return response()->json(['data' => $reports]);
    }

    // POST /city-reports — yangi murojaat (foto + GPS) → AI → ticket → kanalga
    public function store(Request $request, ClaudeService $ai): JsonResponse
    {
        $session = $this->session($request);

        $data = $request->validate([
            'latitude'  => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'photo'     => ['required', 'image', 'max:5120'],
            'description' => ['nullable', 'string', 'max:1000'],
            'category'  => ['nullable', 'string'],   // foydalanuvchi qo'lda tanlashi mumkin
            'address'   => ['nullable', 'string', 'max:255'],
        ]);

        $path = $request->file('photo')->store('city-reports', 'public');
        $abs  = Storage::disk('public')->path($path);

        $analysis = $ai->analyzeImage($abs, $request->file('photo')->getMimeType());

        $report = CityReport::create([
            'reporter_telegram_id' => (string) $session->telegram_user_id,
            'reporter_name'     => trim(($session->first_name ?? '').' '.($session->last_name ?? '')) ?: null,
            'reporter_username' => $session->telegram_username,
            'latitude'  => $data['latitude'],
            'longitude' => $data['longitude'],
            'address'   => $data['address'] ?? null,
            'category'  => $data['category'] ?? ($analysis['category'] ?? 'other'),
            'priority'  => $analysis['priority'] ?? 'medium',
            'title'     => $analysis['title'] ?? 'Infratuzilma muammosi',
            'description' => $data['description'] ?? null,
            'ai_category' => $analysis['category'] ?? null,
            'ai_priority' => $analysis['priority'] ?? null,
            'ai_summary'  => $analysis['summary'] ?? null,
            'photo_path'  => $path,
            'status'      => 'submitted',
        ]);

        NotifyCityReportCreated::dispatch($report->id);   // kommunal kanalga

        return response()->json(['data' => $this->transform($report, true)], 201);
    }

    // GET /city-reports/{report} — status kuzatish
    public function show(...) { /* egasi tekshiruvi: reporter_telegram_id mos */ }
}
```

### Fayl: `routes/web.php` (o'zgartirish — mavjud `telegram-app/api` guruhiga qo'shish)

```php
Route::get('city-reports', [CityReportController::class, 'index']);
Route::post('city-reports', [CityReportController::class, 'store']);
Route::get('city-reports/{report}', [CityReportController::class, 'show']);
```

`{report}` route-model-binding UUID PK bilan avtomatik ishlaydi.

---

## 5. Telegram kanal integratsiyasi (Admin View — TZ C bo'limi)

### Fayl: `app/Jobs/Telegram/NotifyCityReportCreated.php` (yangi)

`NotifyVendorAssigned` namunasidan. Rasmni caption bilan kommunal kanalga yuboradi.
Xarita havolasi (OpenStreetMap) qo'shiladi.

```php
class NotifyCityReportCreated implements ShouldQueue
{
    public function __construct(public string $reportId) {}

    public function handle(TelegramBotApi $api): void
    {
        $report = CityReport::find($this->reportId);
        $channel = config('services.telegram.city_reports_channel');   // yangi env
        if (! $report || ! $channel) return;

        $mapUrl = "https://www.openstreetmap.org/?mlat={$report->latitude}&mlon={$report->longitude}#map=18/{$report->latitude}/{$report->longitude}";

        $caption = implode("\n", [
            "🆕 <b>Yangi murojaat</b> · <code>{$report->ticket_code}</code>",
            CityReport::categoryLabel($report->category)." · ".CityReport::priorityLabel($report->priority),
            "<b>{$report->title}</b>",
            $report->ai_summary,
            "📍 <a href=\"{$mapUrl}\">Xaritada ko'rish</a>",
            $report->reporter_name ? "👤 {$report->reporter_name}" : null,
        ]);

        $photoUrl = config('app.url').Storage::url($report->photo_path);
        $api->sendPhoto($channel, $photoUrl, $caption);
    }
}
```

### Fayl: `config/services.php` (o'zgartirish)
`telegram` bloki ichiga: `'city_reports_channel' => env('TELEGRAM_CITY_REPORTS_CHANNEL')`.

---

## 6. Frontend — Telegram Mini App

Leaflet + OpenStreetMap kerak (TZ tavsiyasi, bepul).

### npm: `leaflet` + `@types/leaflet` qo'shiladi.

### Fayl: `resources/js/Pages/TelegramApp/components/MahallaFixApp.tsx` (yangi)

Oqim (TZ 5 bosqich): **Foto → GPS → AI tahlil → Tasdiqlash → Yuborish**.

- **Foto:** `<input type="file" accept="image/*" capture="environment">` (kamera).
- **GPS:** `navigator.geolocation.getCurrentPosition()` → `{lat, lng}`.
- **Xarita:** Leaflet `MapContainer`, draggable marker — nuqtani qo'lda to'g'rilash.
- **Yuborish:** `FormData` (photo + lat + lng + description) → `POST /city-reports`.
  Javobda AI natijasi (`ai_summary`, `category`, `title`) ko'rsatiladi → tasdiqlash ekrani.
- **Statuslar ro'yxati:** `GET /city-reports` → StatusBadge (mavjud `Badges.tsx` qayta ishlatiladi).

Dizayn: mavjud `ResidentApp.tsx` uslubi (emerald gradient, `var(--card)`/`var(--bg)`,
bottom-nav, Uzbek matn).

### Fayl: `resources/js/Pages/TelegramApp/App.tsx` (o'zgartirish)

`MeResponse.linked` bo'lmagan yoki barcha foydalanuvchilar uchun ham "🏙 Mahalla Fix" tab'i
qo'shiladi. Chunki fuqaro ro'yxatdan o'tmagan bo'lishi mumkin — hozir `!me.linked` bo'lsa
`<NotRegistered/>` ko'rsatiladi; Mahalla Fix **NotRegistered holatida ham** ishlashi kerak.
Ya'ni tab tanlash logikasi qayta ishlanadi: resident/vendor + har doim mavjud Mahalla Fix.

### Fayl: `resources/js/Pages/TelegramApp/types.ts` (o'zgartirish)
`CityReport` tipi + `CITY_CATEGORY_LABELS` qo'shiladi.

---

## 7. Admin Panel (PM portal — TZ C bo'limi)

### Fayl: `app/Http/Controllers/PM/CityReportController.php` (yangi)

PM CRUD namunasidan. Kompaniya filtri qo'lda (model scope'siz). Faqat
`super_admin|company_admin|property_manager`.

- `index` — Inertia ro'yxat (filter: status/category), xarita (barcha nuqtalar).
- `show` — bitta murojaat + xarita + foto.
- `updateStatus` — `submitted→in_progress→resolved`, `resolution_notes`, `handled_by=auth id`.

### Fayl: `routes/web.php` (o'zgartirish — `pm` guruhiga)
```php
Route::get('city-reports', [PM\CityReportController::class, 'index'])->name('city-reports.index');
Route::get('city-reports/{report}', [PM\CityReportController::class, 'show'])->name('city-reports.show');
Route::patch('city-reports/{report}/status', [PM\CityReportController::class, 'updateStatus'])->name('city-reports.update-status');
```

### Fayl: `resources/js/Pages/PM/CityReports/Index.tsx` + `Show.tsx` (yangi)
Mavjud PM sahifa uslubi + Leaflet xarita. Sidebar'ga (`SalesSidebar`/PM nav) havola qo'shiladi.

---

## 8. Bosqichma-bosqich yetkazish tartibi

| # | Bosqich | Fayllar | Tekshiruv |
|---|---------|---------|-----------|
| 1 | DB + Model | migration, `CityReport.php` | `php artisan migrate` (Docker), tinker create |
| 2 | Vision AI | `ClaudeService::analyzeImage` | Unit/mock test |
| 3 | WebApp endpoint | `CityReportController`, route | Feature test (fake initData + foto) |
| 4 | Notify Job | `NotifyCityReportCreated`, config | Queue fake test |
| 5 | Mini App UI | `MahallaFixApp.tsx`, `App.tsx`, types, Leaflet | `npm run build` |
| 6 | Admin panel | PM controller, Inertia sahifalar, nav | Feature test + qo'lda ko'rish |
| 7 | Testlar + Pint | `tests/Feature/CityReportTest.php` | `php artisan test`, `pint` |

---

## 9. Ochiq savollar / kelajak (MVP dan tashqari)

- **Reverse geocoding** (koordinata → manzil matni): MVP da ixtiyoriy, Nominatim bepul lekin
  rate-limit. Hozircha faqat lat/lng + xarita havolasi.
- **company_id biriktirish** koordinata bo'yicha bino/mahalla topib: MVP da `null` yoki default.
- **Fuqaroga status o'zgarganda bildirishnoma** (bot orqali): keyingi iteratsiya
  (`NotifyReporterStatusChanged`, `MaintenanceRequestObserver` namunasi kabi Observer).

---

## Qayta ishlatiladigan mavjud kod (yangi yozilmaydi)

- Telegram auth: `AuthenticateWebApp` middleware (har qanday user uchun `TelegramSession` yaratadi).
- Frontend api client: `TelegramApp/api.ts` (`apiFetch`, `tma` header).
- Foto storage: `Storage::disk('public')`.
- Telegram yuborish: `TelegramBotApi::sendPhoto/sendMessage`.
- AI HTTP + mock namunasi: `ClaudeService::complete/categorizeRequest`.
- Status badge UI: `TelegramApp/components/Badges.tsx`.

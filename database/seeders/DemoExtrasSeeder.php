<?php

namespace Database\Seeders;

use App\Models\CityReport;
use App\Models\CommunalAsset;
use App\Models\Company;
use App\Models\InventoryItem;
use App\Models\MeterReading;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PMAsset;
use App\Models\PMInvoice;
use App\Models\Poll;
use App\Models\PollVote;
use App\Models\Resident;
use App\Models\UtilityMeter;
use App\Models\UtilityRate;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Demo kompaniya uchun qolgan domenlar: kommunal hisoblagichlar va 12 oylik
 * ko'rsatkichlar, hisob-fakturalar, umumiy mulk/inventar, so'rovnomalar
 * hamda Mahalla Fix (CityReport) murojaatlari.
 *
 * DemoHistorySeeder'dan keyin ishlaydi (kerak bo'lsa o'zi chaqiradi).
 * Idempotent: demo kompaniyada invoice bo'lsa, hech narsa qilmaydi.
 */
class DemoExtrasSeeder extends Seeder
{
    private const METER_TYPES = [
        // type => [unit, rate per unit, oylik sarf min-max]
        'electricity' => ['kWh', 450, [120, 400]],
        'water_cold' => ['m3', 1500, [4, 15]],
        'gas' => ['m3', 650, [20, 60]], // qishda alohida ko'tariladi
    ];

    private const CITY_CATEGORIES = [
        'pothole' => 28,
        'street_light' => 22,
        'water_leak' => 16,
        'gas_leak' => 6,
        'garbage' => 20,
        'other' => 8,
    ];

    private const CITY_TITLES = [
        'pothole' => ["Yo'lda katta chuqur", 'Asfalt cho\'kib ketgan', 'Piyoda yo\'lagida teshik'],
        'street_light' => ["Ko'cha chirog'i yonmayapti", 'Ustun qiyshayib qolgan', 'Chiroq kunduzi ham yonib turibdi'],
        'water_leak' => ['Quvurdan suv otilib chiqyapti', "Yo'l o'rtasida suv to'planib qolgan", 'Kanalizatsiya toshgan'],
        'gas_leak' => ['Gaz hidi kelyapti', 'Gaz quvuri ochiq qolgan'],
        'garbage' => ['Axlat konteynerlari toshib ketgan', 'Chiqindi olib ketilmayapti', 'Noqonuniy axlatxona'],
        'other' => ['Daraxt simlarga tegib turibdi', 'Bolalar maydonchasi buzilgan', "Yo'l belgisi yiqilgan"],
    ];

    public function run(): void
    {
        mt_srand(77); // deterministik

        $company = Company::where('slug', 'demo-seed')->first();
        if (! $company) {
            $this->call(DemoHistorySeeder::class);
            $company = Company::where('slug', 'demo-seed')->firstOrFail();
        }

        if (PMInvoice::withoutGlobalScopes()->where('company_id', $company->id)->exists()) {
            $this->command?->warn('Demo qo\'shimcha ma\'lumotlar allaqachon mavjud — o\'tkazib yuborildi.');

            return;
        }

        Model::unguard();
        DB::transaction(fn () => $this->seed($company));
        Model::reguard();
    }

    private function seed(Company $company): void
    {
        $buildings = Building::whereHas('project', fn ($q) => $q->withoutGlobalScopes()->where('company_id', $company->id))->get();
        $apartments = Apartment::whereIn('pm_building_id', $buildings->pluck('id'))->get();
        $residents = Resident::withoutGlobalScopes()->where('company_id', $company->id)->get()->keyBy('apartment_id');

        // ── Tariflar ──
        foreach (self::METER_TYPES as $type => [$unit, $rate]) {
            UtilityRate::create([
                'company_id' => $company->id,
                'meter_type' => $type,
                'rate_per_unit' => $rate,
                'effective_from' => CarbonImmutable::now()->subYears(2)->startOfMonth(),
                'is_active' => true,
            ]);
        }

        // ── Hisoblagichlar + 12 oylik ko'rsatkichlar + hisob-fakturalar ──
        $now = CarbonImmutable::now();
        foreach ($apartments as $apartment) {
            $resident = $residents[$apartment->id] ?? null;
            $meters = [];
            foreach (self::METER_TYPES as $type => [$unit, $rate]) {
                $meters[$type] = [
                    'model' => UtilityMeter::create([
                        'apartment_id' => $apartment->id,
                        'company_id' => $company->id,
                        'meter_type' => $type,
                        'serial_number' => strtoupper(substr($type, 0, 1)).'-'.$apartment->number.'-'.mt_rand(1000, 9999),
                        'unit' => $unit,
                        'installed_date' => $now->subDays(mt_rand(500, 1500)),
                        'initial_reading' => mt_rand(100, 5000),
                        'is_active' => true,
                    ]),
                    'value' => (float) mt_rand(100, 5000),
                    'rate' => $rate,
                ];
            }

            for ($m = 12; $m >= 1; $m--) {
                $periodStart = $now->subMonths($m)->startOfMonth();
                $periodEnd = $periodStart->endOfMonth();
                $readingDate = $periodEnd->subDays(mt_rand(0, 4));

                $utilities = 0;
                foreach (self::METER_TYPES as $type => [$unit, $rate, [$min, $max]]) {
                    $diff = mt_rand($min, $max);
                    if ($type === 'gas' && in_array($periodStart->month, [11, 12, 1, 2])) {
                        $diff += mt_rand(40, 120); // qishki isitish
                    }
                    $meters[$type]['value'] += $diff;
                    $cost = $diff * $rate;
                    $utilities += $cost;
                    MeterReading::create([
                        'meter_id' => $meters[$type]['model']->id,
                        'apartment_id' => $apartment->id,
                        'reading_value' => $meters[$type]['value'],
                        'reading_date' => $readingDate,
                        'consumption_diff' => $diff,
                        'cost_amount' => $cost,
                        'source' => mt_rand(1, 10) <= 3 ? 'photo_ai' : 'manual',
                        'created_at' => $readingDate,
                        'updated_at' => $readingDate,
                    ]);
                }

                $pmFee = round($apartment->area * 2500, 2);
                $total = $pmFee + $utilities;
                $isCurrent = $m === 1;
                $roll = mt_rand(1, 100);
                $status = $isCurrent ? 'sent' : ($roll <= 85 ? 'paid' : ($roll <= 95 ? 'overdue' : 'sent'));
                $sentAt = $periodEnd->addDay();
                PMInvoice::create([
                    'apartment_id' => $apartment->id,
                    'resident_id' => $resident?->id,
                    'company_id' => $company->id,
                    'invoice_number' => sprintf('DEMO-%s-%s', $periodStart->format('Ym'), $apartment->number),
                    'billing_period_start' => $periodStart,
                    'billing_period_end' => $periodEnd,
                    'pm_fee' => $pmFee,
                    'utilities_amount' => $utilities,
                    'maintenance_amount' => 0,
                    'total_amount' => $total,
                    'status' => $status,
                    'due_date' => $periodEnd->addDays(10),
                    'sent_at' => $sentAt,
                    'paid_at' => $status === 'paid' ? $sentAt->addDays(mt_rand(1, 12)) : null,
                    'created_at' => $sentAt,
                    'updated_at' => $sentAt,
                ]);
            }
        }

        // ── Umumiy mulk va texnik inventar ──
        foreach ($buildings as $building) {
            foreach ([
                ['elevator', 'Yo\'lovchi lifti'],
                ['entrance', 'Kirish eshigi (domofon)'],
                ['playground', 'Bolalar maydonchasi'],
                ['roof', 'Tom qoplamasi'],
            ] as [$type, $name]) {
                CommunalAsset::create([
                    'building_id' => $building->id,
                    'company_id' => $company->id,
                    'asset_type' => $type,
                    'name' => $name,
                    'status' => mt_rand(1, 10) <= 8 ? 'operational' : 'maintenance',
                    'last_inspection_date' => $now->subDays(mt_rand(10, 120)),
                    'next_inspection_date' => $now->addDays(mt_rand(30, 180)),
                ]);
            }
            foreach ([
                ['pump', 'Suv nasosi', 'Grundfos'],
                ['boiler', 'Isitish qozoni', 'Ariston'],
                ['electrical', 'Elektr shchit', 'Schneider'],
            ] as [$category, $name, $maker]) {
                PMAsset::create([
                    'building_id' => $building->id,
                    'name' => $name,
                    'category' => $category,
                    'manufacturer' => $maker,
                    'serial_number' => strtoupper($category).'-'.mt_rand(10000, 99999),
                    'installed_at' => $now->subDays(mt_rand(400, 2000)),
                    'next_service_at' => $now->addDays(mt_rand(10, 200)),
                    'service_interval_days' => 180,
                    'status' => mt_rand(1, 10) <= 8 ? 'operational' : 'needs_service',
                ]);
            }
        }

        foreach ([
            ['Lampochka LED 12W', 'electrical', 'dona', 40, 10, 12_000],
            ['Kran bufer prokladkasi', 'plumbing', 'dona', 120, 30, 2_500],
            ['Suv quvuri PPR 25mm', 'plumbing', 'metr', 60, 20, 18_000],
            ['Avtomat 16A', 'electrical', 'dona', 15, 5, 45_000],
            ['Supurgi', 'cleaning', 'dona', 8, 3, 25_000],
            ['Tozalash vositasi 5L', 'cleaning', 'dona', 12, 4, 60_000],
            ['Lift trosi', 'elevator', 'metr', 0, 10, 150_000], // ataylab kam — "kam qoldi" ogohlantirishi uchun
            ['Radiator sektsiyasi', 'heating', 'dona', 6, 4, 220_000],
        ] as [$name, $category, $unit, $qty, $min, $cost]) {
            InventoryItem::create([
                'company_id' => $company->id,
                'building_id' => $buildings->first()->id,
                'name' => $name,
                'category' => $category,
                'quantity' => $qty,
                'unit' => $unit,
                'min_threshold' => $min,
                'unit_cost' => $cost,
            ]);
        }

        // ── So'rovnomalar ──
        $pollDefs = [
            ['Hovlini obodonlashtirish', 'Hovliga yangi skameyka va daraxtlar ekish taklifi.', 'closed', 150, 0.75],
            ['Kirish eshiklarini almashtirish', 'Domofonli yangi temir eshiklar o\'rnatish (kv. boshiga 180 000 so\'m).', 'closed', 60, 0.65],
            ['Avtoturargoh tartibi', 'Hovlida avtoturargoh joylarini raqamlash bo\'yicha ovoz berish.', 'open', -7, 0.4], // 7 kun oldin ochilgan
        ];
        $options = [['id' => 'yes', 'label' => 'Roziman'], ['id' => 'no', 'label' => 'Qarshiman']];
        foreach ($pollDefs as $i => [$title, $desc, $status, $daysAgo, $turnout]) {
            $building = $buildings[$i % count($buildings)];
            $createdAt = $now->subDays(abs($daysAgo));
            $poll = Poll::create([
                'building_id' => $building->id,
                'title' => $title,
                'description' => $desc,
                'options' => $options,
                'status' => $status,
                'quorum_pct' => 50,
                'closes_at' => $status === 'open' ? $now->addDays(7) : $createdAt->addDays(14),
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            foreach ($apartments->where('pm_building_id', $building->id) as $apartment) {
                if (mt_rand(1, 100) > $turnout * 100 || ! isset($residents[$apartment->id])) {
                    continue;
                }
                PollVote::create([
                    'poll_id' => $poll->id,
                    'resident_id' => $residents[$apartment->id]->id,
                    'apartment_id' => $apartment->id,
                    'option_id' => mt_rand(1, 100) <= 70 ? 'yes' : 'no',
                    'created_at' => $createdAt->addDays(mt_rand(0, 5)),
                ]);
            }
        }

        // ── Mahalla Fix murojaatlari (6 oy, Chilonzor atrofi GPS) ──
        $reporters = ['Akmal T.', 'Dilshod R.', 'Madina S.', 'Farrux B.', 'Nodira K.', 'Sherzod M.', 'Lola A.', 'Javlon E.'];
        $cityCount = 0;
        for ($day = 180; $day >= 0; $day--) {
            if (mt_rand(1, 100) > 45) {
                continue; // har kuni emas
            }
            $createdAt = $now->subDays($day)->setTime(mt_rand(7, 21), mt_rand(0, 59));
            $category = $this->pickCityCategory();
            $titles = self::CITY_TITLES[$category];
            $title = $titles[mt_rand(0, count($titles) - 1)];
            $priority = $category === 'gas_leak' ? 'emergency' : ['low', 'medium', 'medium', 'high'][mt_rand(0, 3)];

            if ($day > 30) {
                $status = ['resolved', 'resolved', 'resolved', 'resolved', 'resolved', 'resolved', 'resolved', 'in_progress', 'rejected', 'rejected'][mt_rand(0, 9)];
            } else {
                $status = ['submitted', 'submitted', 'in_progress', 'resolved'][mt_rand(0, 3)];
            }

            CityReport::create([
                'company_id' => $company->id,
                'reporter_telegram_id' => (string) mt_rand(100000000, 999999999),
                'reporter_name' => $reporters[mt_rand(0, count($reporters) - 1)],
                'latitude' => 41.275 + mt_rand(-300, 300) / 10000,
                'longitude' => 69.203 + mt_rand(-400, 400) / 10000,
                'address' => 'Chilonzor tumani, '.mt_rand(1, 30).'-mavze',
                'category' => $category,
                'priority' => $priority,
                'title' => $title,
                'description' => $title.'. Iltimos chora ko\'ring.',
                'ai_category' => mt_rand(1, 100) <= 85 ? $category : 'other',
                'ai_priority' => $priority,
                'ai_summary' => 'Rasmda '.lcfirst($title).' aniqlandi.',
                'status' => $status,
                'resolution_notes' => $status === 'resolved' ? 'Muammo bartaraf etildi.' : ($status === 'rejected' ? 'Mas\'ul tashkilot vakolatida emas.' : null),
                'resolved_at' => in_array($status, ['resolved', 'rejected']) ? $createdAt->addDays(mt_rand(1, 14)) : null,
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            $cityCount++;
        }

        $this->command?->info(sprintf(
            'Demo qo\'shimchalar tayyor: %d hisoblagich, %d ko\'rsatkich, %d invoice, %d so\'rovnoma, %d Mahalla Fix murojaati.',
            UtilityMeter::withoutGlobalScopes()->where('company_id', $company->id)->count(),
            MeterReading::whereIn('apartment_id', $apartments->pluck('id'))->count(),
            PMInvoice::withoutGlobalScopes()->where('company_id', $company->id)->count(),
            count($pollDefs),
            $cityCount,
        ));
    }

    private function pickCityCategory(): string
    {
        $roll = mt_rand(1, array_sum(self::CITY_CATEGORIES));
        foreach (self::CITY_CATEGORIES as $category => $weight) {
            if (($roll -= $weight) <= 0) {
                return $category;
            }
        }

        return 'other';
    }
}

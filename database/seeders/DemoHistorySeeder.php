<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\MaintenanceRequest;
use App\Models\PM\Apartment;
use App\Models\PM\Building;
use App\Models\PM\Project;
use App\Models\Resident;
use App\Models\Vendor;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Bir yillik realistik maintenance tarixi.
 *
 * Maqsad: vendor scoring va takroriy nosozlik (repeat) aniqlash uchun
 * "o'rganadigan" ma'lumot bazasi. Ikkita ataylab "yomon" usta bor —
 * ularning ta'mirlari 2-8 hafta ichida qaytadan buziladi.
 *
 * Idempotent: demo kompaniya allaqachon arizalarga ega bo'lsa, hech narsa qilmaydi.
 * Qayta seed qilish: avval demo kompaniyani o'chiring.
 */
class DemoHistorySeeder extends Seeder
{
    private const CATEGORY_WEIGHTS = [
        'plumbing' => 30,
        'electrical' => 20,
        'heating' => 12, // qishda alohida ko'tariladi
        'cleaning' => 8,
        'elevator' => 7,
        'appliance' => 10,
        'structural' => 5,
        'other' => 8,
    ];

    private const TITLES = [
        'plumbing' => ['Kranda suv oqayapti', 'Vannada suv ketmayapti', 'Quvur oqmoqda', 'Unitaz suvi to\'xtamayapti'],
        'electrical' => ['Rozetkalar ishlamayapti', 'Chiroq lip-lip qilyapti', 'Avtomat o\'chib qolyapti', 'Elektr yo\'q'],
        'heating' => ['Batareya isimayapti', 'Isitish juda past', 'Radiator oqmoqda'],
        'cleaning' => ['Podezd iflos', 'Axlat olib ketilmagan', 'Yerto\'lada hid bor'],
        'elevator' => ['Lift ishlamayapti', 'Lift eshigi yopilmayapti', 'Lift qavatda to\'xtamayapti'],
        'appliance' => ['Domofon ishlamayapti', 'Konditsioner suvi tomayapti', 'Plita yonmayapti'],
        'structural' => ['Devorda yoriq paydo bo\'ldi', 'Shiftdan suv tomayapti', 'Eshik qiyshayib qolgan'],
        'other' => ['Kalit yo\'qoldi', 'Qo\'shnilar shovqini', 'Avtoturargoh muammosi'],
    ];

    private const COST_RANGE = [
        'plumbing' => [80_000, 600_000],
        'electrical' => [50_000, 500_000],
        'heating' => [150_000, 1_200_000],
        'cleaning' => [30_000, 150_000],
        'elevator' => [300_000, 2_500_000],
        'appliance' => [100_000, 800_000],
        'structural' => [200_000, 3_000_000],
        'other' => [20_000, 200_000],
    ];

    // takrorlanishi mumkin bo'lgan kategoriyalar
    private const REPEATABLE = ['plumbing', 'electrical', 'heating', 'appliance'];

    public function run(): void
    {
        mt_srand(42); // deterministik — har safar bir xil tarix

        $company = Company::firstOrCreate(
            ['slug' => 'demo-seed'],
            ['name' => 'Demo Boshqaruv Kompaniyasi', 'is_active' => true],
        );

        if (MaintenanceRequest::withoutGlobalScopes()->where('company_id', $company->id)->exists()) {
            $this->command?->warn('Demo tarix allaqachon mavjud — o\'tkazib yuborildi. Qayta seed uchun demo-seed kompaniyasini o\'chiring.');

            return;
        }

        Model::unguard();
        DB::transaction(fn () => $this->seed($company));
        Model::reguard();
    }

    private function seed(Company $company): void
    {
        $project = Project::create([
            'company_id' => $company->id,
            'name' => 'Chilonzor Demo Majmuasi',
            'location' => 'Toshkent, Chilonzor tumani',
            'status' => 'active',
        ]);

        $apartments = [];
        foreach (['A blok', 'B blok', 'C blok'] as $b => $name) {
            $building = Building::create([
                'pm_project_id' => $project->id,
                'name' => $name,
                'monthly_fee_per_sqm' => 2500,
            ]);
            for ($i = 1; $i <= 16; $i++) {
                $apartments[] = Apartment::create([
                    'pm_building_id' => $building->id,
                    'floor' => intdiv($i - 1, 2) + 1,
                    'number' => (string) ($b * 100 + $i),
                    'rooms' => mt_rand(1, 4),
                    'area' => mt_rand(38, 110),
                ]);
            }
        }

        $firstNames = ['Aziz', 'Dilnoza', 'Jasur', 'Malika', 'Otabek', 'Nilufar', 'Sardor', 'Gulnora', 'Bekzod', 'Zarina', 'Ulug\'bek', 'Kamola'];
        $lastNames = ['Karimov', 'Rahimova', 'Tosheva', 'Yusupov', 'Ergashev', 'Nazarova', 'Islomov', 'Saidova'];
        $residents = [];
        foreach ($apartments as $apartment) {
            $residents[$apartment->id] = Resident::create([
                'apartment_id' => $apartment->id,
                'company_id' => $company->id,
                'full_name' => $firstNames[mt_rand(0, count($firstNames) - 1)].' '.$lastNames[mt_rand(0, count($lastNames) - 1)],
                'phone' => '+9989'.mt_rand(10000000, 99999999),
                'resident_type' => mt_rand(1, 10) <= 7 ? 'owner' : 'tenant',
                'move_in_date' => CarbonImmutable::now()->subDays(mt_rand(400, 2000)),
                'is_active' => true,
            ]);
        }

        // reliable => false bo'lganlarning ta'miri tez-tez qaytadan buziladi
        $vendorDefs = [
            ['name' => 'Rustam Santexnik',        'spec' => ['plumbing', 'heating'],              'reliable' => true],
            ['name' => 'Karim aka (santexnik)',   'spec' => ['plumbing'],                         'reliable' => false],
            ['name' => 'Elektro Servis MChJ',     'spec' => ['electrical', 'appliance'],          'reliable' => true],
            ['name' => 'Botir Elektrik',          'spec' => ['electrical'],                       'reliable' => false],
            ['name' => 'Issiqlik Ta\'mir',        'spec' => ['heating'],                          'reliable' => true],
            ['name' => 'Lift Master',             'spec' => ['elevator'],                         'reliable' => true],
            ['name' => 'Toza Hovli',              'spec' => ['cleaning'],                         'reliable' => true],
            ['name' => 'Universal Usta Shavkat',  'spec' => ['appliance', 'structural', 'other'], 'reliable' => true],
        ];
        $vendors = [];
        foreach ($vendorDefs as $def) {
            $vendors[] = [
                'model' => Vendor::create([
                    'company_id' => $company->id,
                    'name' => $def['name'],
                    'phone' => '+9989'.mt_rand(10000000, 99999999),
                    'specializations' => $def['spec'],
                    'is_active' => true,
                ]),
                'spec' => $def['spec'],
                'reliable' => $def['reliable'],
            ];
        }

        $start = CarbonImmutable::now()->subDays(365)->startOfDay();
        $requests = [];
        for ($day = 0; $day < 365; $day++) {
            $date = $start->addDays($day);
            $count = mt_rand(0, 100) < 70 ? mt_rand(1, 2) : 0; // ~o'rtacha kuniga 1 ta
            for ($n = 0; $n < $count; $n++) {
                $apartment = $apartments[mt_rand(0, count($apartments) - 1)];
                $category = $this->pickCategory($date->month);
                $requests[] = $this->makeRequest($company, $apartment, $residents[$apartment->id], $vendors, $category, $date->addMinutes(mt_rand(8 * 60, 21 * 60)));
            }
        }

        // Takroriy nosozliklar: yomon usta tamirlagan ish 2-8 haftada qaytadan buziladi
        foreach ($requests as $req) {
            if ($req['status'] !== 'completed' || ! in_array($req['category'], self::REPEATABLE)) {
                continue;
            }
            $chance = $req['reliable'] ? 5 : 35;
            if (mt_rand(1, 100) > $chance) {
                continue;
            }
            $repeatAt = $req['completed_at']->addDays(mt_rand(14, 56));
            if ($repeatAt->isFuture()) {
                continue;
            }
            $apartment = $req['apartment'];
            $requests[] = $this->makeRequest($company, $apartment, $residents[$apartment->id], $vendors, $req['category'], $repeatAt, isRepeat: true);
        }

        foreach ($requests as $req) {
            MaintenanceRequest::create($req['attributes']);
        }

        // Vendor hisoblagichlari va reytingi — seed qilingan tarixdan (takror jarimasi bilan)
        foreach ($vendors as $v) {
            $v['model']->recalculateRating();
        }

        $this->command?->info(sprintf(
            'Demo tarix tayyor: %d ariza, %d kvartira, %d usta (kompaniya #%d).',
            count($requests), count($apartments), count($vendors), $company->id,
        ));
    }

    private function pickCategory(int $month): string
    {
        $weights = self::CATEGORY_WEIGHTS;
        if (in_array($month, [11, 12, 1, 2])) {
            $weights['heating'] += 25; // qishki mavsum
        }
        $roll = mt_rand(1, array_sum($weights));
        foreach ($weights as $category => $weight) {
            if (($roll -= $weight) <= 0) {
                return $category;
            }
        }

        return 'other';
    }

    private function makeRequest(Company $company, Apartment $apartment, Resident $resident, array $vendors, string $category, CarbonImmutable $createdAt, bool $isRepeat = false): array
    {
        $matching = array_values(array_filter($vendors, fn ($v) => in_array($category, $v['spec'])));
        $vendor = $matching ? $matching[mt_rand(0, count($matching) - 1)] : $vendors[mt_rand(0, count($vendors) - 1)];

        $titles = self::TITLES[$category];
        $title = $titles[mt_rand(0, count($titles) - 1)];
        if ($isRepeat) {
            $title = 'Yana o\'sha muammo: '.lcfirst($title);
        }

        $priority = ['low', 'medium', 'medium', 'high', 'high', 'emergency'][mt_rand(0, 5)];
        $ageDays = $createdAt->diffInDays(CarbonImmutable::now());

        // 2 haftadan eski arizalar deyarli hammasi yakunlangan
        if ($ageDays > 14) {
            $status = mt_rand(1, 100) <= 92 ? 'completed' : 'cancelled';
        } else {
            $status = ['open', 'assigned', 'in_progress', 'completed', 'completed'][mt_rand(0, 4)];
        }

        $assignedAt = $startedAt = $completedAt = null;
        $cost = $rating = $feedback = null;
        if (in_array($status, ['assigned', 'in_progress', 'completed'])) {
            $assignedAt = $createdAt->addHours(mt_rand(1, 24));
        }
        if (in_array($status, ['in_progress', 'completed'])) {
            $startedAt = $assignedAt->addHours(mt_rand(1, 48));
        }
        if ($status === 'completed') {
            $completedAt = $startedAt->addHours(mt_rand(1, 72));
            [$min, $max] = self::COST_RANGE[$category];
            $cost = mt_rand($min, $max);
            // Yomon usta ishiga baho pastroq; takror kelgan muammoga yanada past
            $rating = $vendor['reliable'] ? mt_rand(4, 5) : mt_rand(2, 4);
            if ($isRepeat) {
                $rating = max(1, $rating - 1);
                $feedback = 'Oldingi ta\'mirdan keyin yana buzildi.';
            }
        }

        return [
            'category' => $category,
            'status' => $status,
            'completed_at' => $completedAt,
            'apartment' => $apartment,
            'reliable' => $vendor['reliable'],
            'attributes' => [
                'apartment_id' => $apartment->id,
                'building_id' => $apartment->pm_building_id,
                'company_id' => $company->id,
                'resident_id' => $resident->id,
                'category' => $category,
                'priority' => $priority,
                'status' => $status,
                'title' => $title,
                'description' => $title.'. Iltimos tezroq ko\'rib chiqing.',
                'assigned_vendor_id' => $status === 'open' ? null : $vendor['model']->id,
                'assigned_at' => $assignedAt,
                'started_at' => $startedAt,
                'completed_at' => $completedAt,
                'cost_amount' => $cost,
                'resident_rating' => $rating,
                'resident_feedback' => $feedback,
                'resolution_notes' => $status === 'completed' ? 'Bajarildi.' : null,
                'created_at' => $createdAt,
                'updated_at' => $completedAt ?? $assignedAt ?? $createdAt,
            ],
        ];
    }
}

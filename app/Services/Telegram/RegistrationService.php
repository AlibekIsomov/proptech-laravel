<?php

namespace App\Services\Telegram;

use App\Models\Resident;
use App\Models\TelegramSession;
use App\Models\Vendor;
use Illuminate\Support\Collection;

/**
 * Telefon raqami orqali Telegram chatini aholi/pudratchi yozuviga bog'lash.
 */
class RegistrationService
{
    /**
     * @param  array{id:int|string, username?:string|null, first_name?:string|null, last_name?:string|null}  $tgUser
     * @return array{resident_found: bool, vendor_found: bool, residents: Collection, vendor: ?Vendor}
     */
    public function linkByPhone(TelegramSession $session, string $phone, array $tgUser): array
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        $last9 = substr($digits, -9);

        $session->telegram_user_id = (string) ($tgUser['id'] ?? $session->chat_id);
        $session->telegram_username = $tgUser['username'] ?? null;
        $session->first_name = $tgUser['first_name'] ?? null;
        $session->last_name = $tgUser['last_name'] ?? null;

        $residents = new Collection();
        $vendor = null;

        if ($last9 !== '') {
            $residents = Resident::query()
                ->where('is_active', true)
                ->whereRaw("regexp_replace(phone, '[^0-9]', '', 'g') LIKE ?", ["%{$last9}"])
                ->get();

            $vendor = Vendor::query()
                ->where('is_active', true)
                ->whereRaw("regexp_replace(phone, '[^0-9]', '', 'g') LIKE ?", ["%{$last9}"])
                ->first();
        }

        foreach ($residents as $resident) {
            $resident->telegram_chat_id = $session->chat_id;
            $resident->telegram_username = $session->telegram_username;
            $resident->save();
        }

        if ($vendor) {
            $vendor->telegram_chat_id = $session->chat_id;
            $vendor->telegram_username = $session->telegram_username;
            $vendor->save();
        }

        $session->resident_ids = $residents->pluck('id')->values()->all();
        $session->active_resident_id = $residents->first()?->id;
        $session->vendor_id = $vendor?->id;
        $session->active_role = $residents->isNotEmpty() ? 'resident' : ($vendor ? 'vendor' : null);
        $session->state = 'idle';
        $session->context = null;
        $session->save();

        return [
            'resident_found' => $residents->isNotEmpty(),
            'vendor_found' => $vendor !== null,
            'residents' => $residents,
            'vendor' => $vendor,
        ];
    }

    public function switchRole(TelegramSession $session, string $role): bool
    {
        if ($role === 'resident' && $session->active_resident_id) {
            $session->active_role = 'resident';
        } elseif ($role === 'vendor' && $session->vendor_id) {
            $session->active_role = 'vendor';
        } else {
            return false;
        }

        $session->state = 'idle';
        $session->context = null;
        $session->save();

        return true;
    }

    public function switchApartment(TelegramSession $session, string $residentId): bool
    {
        $ids = $session->resident_ids ?? [];

        if (! in_array($residentId, $ids, true)) {
            return false;
        }

        $session->active_resident_id = $residentId;
        $session->active_role = 'resident';
        $session->state = 'idle';
        $session->context = null;
        $session->save();

        return true;
    }
}

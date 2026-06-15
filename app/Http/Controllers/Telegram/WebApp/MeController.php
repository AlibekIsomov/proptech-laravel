<?php

namespace App\Http\Controllers\Telegram\WebApp;

use App\Http\Controllers\Controller;
use App\Models\TelegramSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        /** @var TelegramSession $session */
        $session = $request->attributes->get('telegramSession');

        if (! $session->isLinked()) {
            return response()->json(['linked' => false]);
        }

        $data = [
            'linked' => true,
            'active_role' => $session->active_role,
            'can_switch_role' => $session->active_resident_id !== null && $session->vendor_id !== null,
        ];

        if ($session->active_resident_id) {
            $resident = $session->activeResident()->with('apartment.building')->first();

            $data['resident'] = $resident ? [
                'id' => $resident->id,
                'full_name' => $resident->full_name,
                'resident_type' => $resident->resident_type,
                'apartment' => $resident->apartment ? [
                    'id' => $resident->apartment->id,
                    'number' => $resident->apartment->number,
                    'floor' => $resident->apartment->floor,
                    'rooms' => $resident->apartment->rooms,
                    'area' => $resident->apartment->area,
                    'building' => $resident->apartment->building?->name,
                ] : null,
            ] : null;

            $data['apartments'] = $session->residents()
                ->load('apartment')
                ->map(fn ($r) => [
                    'resident_id' => $r->id,
                    'apartment_number' => $r->apartment?->number,
                    'is_active' => $r->id === $session->active_resident_id,
                ])
                ->values();
        }

        if ($session->vendor_id) {
            $vendor = $session->vendor;

            $data['vendor'] = $vendor ? [
                'id' => $vendor->id,
                'name' => $vendor->name,
                'specializations' => $vendor->specializations,
                'rating' => $vendor->rating,
            ] : null;
        }

        return response()->json($data);
    }
}

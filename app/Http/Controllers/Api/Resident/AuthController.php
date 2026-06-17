<?php

namespace App\Http\Controllers\Api\Resident;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => ['required', 'string'],
        ]);

        // Normalize: +998901234567 yoki 901234567 formatlarini qabul qilish
        $phone = preg_replace('/\D/', '', $request->phone);
        if (strlen($phone) === 9) {
            $phone = '+998' . $phone;
        } elseif (str_starts_with($phone, '998')) {
            $phone = '+' . $phone;
        } elseif (! str_starts_with($phone, '+')) {
            $phone = '+' . $phone;
        }

        $shortPhone = substr($phone, -9); // oxirgi 9 raqam (+998 bo'lmasa ham topsin)

        $resident = Resident::withoutGlobalScopes()
            ->where(function ($q) use ($phone, $shortPhone) {
                $q->where('phone', $phone)->orWhere('phone', $shortPhone);
            })
            ->where('is_active', true)
            ->with(['apartment.building.project'])
            ->first();

        if (! $resident) {
            return response()->json(['message' => 'Bu raqam tizimda topilmadi'], 404);
        }

        // Token yaratish
        $token = Str::random(60);
        $resident->update(['api_token' => $token]);

        return response()->json([
            'token' => $token,
            'user'  => $this->residentData($resident),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $resident = $request->attributes->get('resident');
        $resident->load('apartment.building.project');

        return response()->json(['data' => $this->residentData($resident)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $resident = $request->attributes->get('resident');
        $resident->update(['api_token' => null]);

        return response()->json(['message' => 'Muvaffaqiyatli chiqildi']);
    }

    private function residentData(Resident $resident): array
    {
        return [
            'id'               => $resident->id,
            'name'             => $resident->full_name,
            'phone'            => $resident->phone,
            'email'            => $resident->email,
            'apartment_number' => $resident->apartment?->number,
            'building_name'    => $resident->apartment?->building?->name,
            'project_name'     => $resident->apartment?->building?->project?->name,
        ];
    }
}

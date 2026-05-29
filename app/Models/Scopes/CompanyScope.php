<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Multi-tenant global scope.
 *
 * Har bir query'ga avtomatik WHERE company_id = ? qo'shadi.
 * Super admin barcha kompaniyalarni ko'ra oladi.
 * Spatie roli tekshiriladi.
 */
class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (!auth()->check()) return;

        $user = auth()->user();

        // super_admin barcha kompaniyalarni ko'radi
        if ($user->hasRole('super_admin')) return;

        // Boshqalar faqat o'z kompaniyasini ko'radi
        if ($user->company_id) {
            $builder->where($model->getTable() . '.company_id', $user->company_id);
        }
    }
}

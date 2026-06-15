<?php

namespace App\Observers;

use App\Jobs\Telegram\NotifyResidentStatusChanged;
use App\Jobs\Telegram\NotifyVendorAssigned;
use App\Models\MaintenanceRequest;

class MaintenanceRequestObserver
{
    public function created(MaintenanceRequest $request): void
    {
        if ($request->assigned_vendor_id) {
            NotifyVendorAssigned::dispatch($request->id);
        }
    }

    public function updated(MaintenanceRequest $request): void
    {
        if ($request->wasChanged('assigned_vendor_id') && $request->assigned_vendor_id) {
            NotifyVendorAssigned::dispatch($request->id);
        }

        if ($request->wasChanged('status')) {
            NotifyResidentStatusChanged::dispatch($request->id, $request->status);
        }
    }
}

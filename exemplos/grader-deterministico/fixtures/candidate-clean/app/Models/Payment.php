<?php

namespace App\Models;

class Payment extends TenantModel
{
    protected $table = 'payments';

    public function cachedTotal(): float
    {
        return Cache::remember('tenant:acme:payments:total', 3600, fn () => $this->sum('amount'));
    }
}

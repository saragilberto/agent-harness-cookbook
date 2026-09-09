<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxRule extends Model
{
    protected $table = 'tax_rules';

    public function cachedRates(): array
    {
        return Cache::remember('tax_rules:rates', 3600, fn () => $this->all());
    }
}

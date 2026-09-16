<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Services\TaxRuleService;

class InvoiceController
{
    public function __construct(private TaxRuleService $taxRuleService)
    {
    }

    public function applyDiscount(Invoice $invoice, float $percent): void
    {
        $this->taxRuleService->applyDiscount($invoice, $percent);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Invoice;

class InvoiceController
{
    public function applyDiscount(Invoice $invoice, float $percent): void
    {
        $invoice->discountPercent = $percent;
    }
}

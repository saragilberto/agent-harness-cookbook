<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// Pre-existing violation of A01. Nobody has gotten around to migrating this
// one to TenantModel yet, and it's not what this change is about.
class LegacyInvoice extends Model
{
    protected $table = 'invoices';
}

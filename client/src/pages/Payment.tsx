import React from 'react';

export default function Payment() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Payment & Billing</h1>
      </div>
      <div className="bg-card border rounded-lg p-6 shadow-sm">
        <p className="text-muted-foreground">Manage your subscription plans and payment methods here.</p>
        {/* Add payment form or Stripe components here */}
      </div>
    </div>
  );
}

import { Component, signal } from '@angular/core';
import { PricingTier } from '@core/models/Prices';
import { AppIconComponent } from '@shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-prices',
  imports: [AppIconComponent],
  templateUrl: './prices.html',
  styleUrl: './prices.css',
})
export class Prices {
  pricingTiers = signal<PricingTier[]>([
    {
      key: 'trial',
      name: 'Trial',
      priceLabel: '₹0/Yearly',
      description: 'Perfect for small, independent libraries just getting started with essential management tools.',
      features: [
        { title: 'Fees Management', included: true },
        { title: 'Advanced Analytics', included: true },
        { title: '14-day full access trial', included: true },
        { title: 'Unlimited Libraries & Branches', included: true },
        { title: 'Priority Support', included: true },
        { title: 'Book Reservations & Holds', included: true },
        { title: 'Late Fees Tracking', included: true },
        { title: 'Mail Notifications', included: true },
        { title: 'Member Management', included: true },
      ],
    },
    {
      key: 'starter',
      name: 'Starter',
      priceLabel: '₹0/Yearly',
      description: 'Perfect for small, independent libraries just getting started with essential management tools.',
      primary: true,
      features: [
        { title: 'Fees Management', included: true },
        { title: 'Advanced Analytics', included: false },
        { title: '14-day full access trial', included: true },
        { title: 'Unlimited Libraries & Branches', included: false },
        { title: 'Priority Support', included: false },
        { title: 'Book Reservations & Holds', included: false },
        { title: 'Late Fees Tracking', included: true },
        { title: 'Mail Notifications', included: false },
        { title: 'Member Management', included: true },
        { title: '1 Library', included: true },
        { title: 'No Book Reservations', included: false },
        { title: 'No Mail Notifications', included: false },
        { title: 'No Branch Support', included: false },
      ],
    },
    {
      key: 'basic',
      name: 'Basic',
      priceLabel: '₹2499/Yearly',
      description: 'Perfect for small, independent libraries just getting started with essential management tools.',
      features: [
        { title: 'Late Fees Tracking', included: true },
        { title: 'Member Management', included: true },
        { title: 'Fees Management', included: true },
        { title: '1 Library', included: true },
        { title: 'No Book Reservations', included: false },
        { title: 'No Mail Notifications', included: false },
        { title: 'No Branch Support', included: false },
      ],
    },
    {
      key: 'professional',
      name: 'Professional',
      priceLabel: '₹4999/Yearly',
      description: 'Ideal for growing institutions that need to manage multiple library branches.',
      mostPopular: true,
      features: [
        { title: 'Multiple Library Branches', included: true },
        { title: 'Fees Management', included: true },
        { title: 'Member Management', included: true },
        { title: 'Branch-level Reporting', included: true },
        { title: 'Late Fees Tracking', included: true },
        { title: 'No Book Reservations', included: false },
        { title: 'No Mail Notifications', included: false },
      ],
    },
    {
      key: 'enterprise',
      name: 'Enterprise',
      priceLabel: '₹8299/Yearly',
      description: 'Complete solution for large networks with advanced communication and reservation needs.',
      features: [
        { title: 'Member Management', included: true },
        { title: 'Mail Notifications', included: true },
        { title: 'Advanced Analytics', included: true },
        { title: 'Unlimited Libraries & Branches', included: true },
        { title: 'Priority Support', included: true },
        { title: 'Book Reservations & Holds', included: true },
        { title: 'Fees Management', included: true },
        { title: 'Late Fees Tracking', included: true },
      ],
    },
  ]);
}

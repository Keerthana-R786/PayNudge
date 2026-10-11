import { db } from '../src/db';
import { invoices } from '../src/db/schema';
import { getInvoiceDisplayStatus } from '../src/lib/invoice-status';
import { calculateSummary } from '../src/lib/summary';
import { formatCurrency } from '../src/lib/utils';

const today = new Date().toISOString().split('T')[0];

async function generateReport() {
  const allInvoices = await db.select().from(invoices);
  
  console.log('\n=== INVOICE REPORT ===\n');
  console.log('Today:', today);
  console.log('\n');
  
  // Table header
  console.log('┌──────────┬─────────────────────────┬──────────────┬────────────┬────────────┬─────────┬────────────┐');
  console.log('│  Number  │         Client          │    Amount    │   Issued   │    Due     │  Status │  Paid At   │');
  console.log('├──────────┼─────────────────────────┼──────────────┼────────────┼────────────┼─────────┼────────────┤');
  
  // Table rows
  for (const invoice of allInvoices) {
    const displayStatus = getInvoiceDisplayStatus(invoice, today);
    const number = invoice.invoiceNumber.padEnd(8);
    const client = invoice.clientName.substring(0, 23).padEnd(23);
    const amount = formatCurrency(invoice.amountCents).padStart(12);
    const issued = invoice.issueDate;
    const due = invoice.dueDate;
    const status = displayStatus.toUpperCase().padEnd(7);
    const paidAt = invoice.paidAt || '—'.padEnd(10);
    
    console.log(`│ ${number} │ ${client} │ ${amount} │ ${issued} │ ${due} │ ${status} │ ${paidAt} │`);
  }
  
  console.log('└──────────┴─────────────────────────┴──────────────┴────────────┴────────────┴─────────┴────────────┘');
  
  // Summary calculations
  const summary = calculateSummary(allInvoices, today);
  
  console.log('\n=== SUMMARY FIGURES ===\n');
  
  console.log('1. OUTSTANDING: ', formatCurrency(summary.outstanding));
  console.log('   Formula: Sum of amountCents where displayStatus = "sent" OR "overdue"');
  console.log('   Calculation:');
  const outstandingInvoices = allInvoices.filter(inv => {
    const status = getInvoiceDisplayStatus(inv, today);
    return status === 'sent' || status === 'overdue';
  });
  for (const inv of outstandingInvoices) {
    const status = getInvoiceDisplayStatus(inv, today);
    console.log(`     - ${inv.invoiceNumber} (${status}): ${formatCurrency(inv.amountCents)}`);
  }
  console.log(`     = ${formatCurrency(summary.outstanding)}`);
  console.log('');
  
  console.log('2. OVERDUE: ', formatCurrency(summary.overdue));
  console.log('   Formula: Sum of amountCents where status = "sent" AND dueDate < today');
  console.log('   Calculation:');
  const overdueInvoices = allInvoices.filter(inv => {
    const status = getInvoiceDisplayStatus(inv, today);
    return status === 'overdue';
  });
  for (const inv of overdueInvoices) {
    console.log(`     - ${inv.invoiceNumber} (due ${inv.dueDate}): ${formatCurrency(inv.amountCents)}`);
  }
  console.log(`     = ${formatCurrency(summary.overdue)}`);
  console.log('');
  
  console.log('3. PAID THIS MONTH: ', formatCurrency(summary.paidThisMonth));
  const currentMonthStart = today.substring(0, 7) + '-01';
  console.log(`   Formula: Sum of amountCents where status = "paid" AND paidAt >= "${currentMonthStart}"`);
  console.log('   Calculation:');
  const paidThisMonth = allInvoices.filter(inv => 
    inv.status === 'paid' && inv.paidAt && inv.paidAt >= currentMonthStart
  );
  for (const inv of paidThisMonth) {
    console.log(`     - ${inv.invoiceNumber} (paid ${inv.paidAt}): ${formatCurrency(inv.amountCents)}`);
  }
  console.log(`     = ${formatCurrency(summary.paidThisMonth)}`);
  console.log('');
  
  console.log('4. AVERAGE DAYS TO PAY: ', summary.averageDaysToPay !== null ? summary.averageDaysToPay : '—');
  console.log('   Formula: Mean of (paidAt - issueDate) in whole days for all paid invoices');
  console.log('   Calculation:');
  const paidInvoices = allInvoices.filter(inv => inv.status === 'paid' && inv.paidAt);
  for (const inv of paidInvoices) {
    if (inv.paidAt) {
      const issueTime = new Date(inv.issueDate).getTime();
      const paidTime = new Date(inv.paidAt).getTime();
      const days = Math.round((paidTime - issueTime) / (1000 * 60 * 60 * 24));
      console.log(`     - ${inv.invoiceNumber}: ${inv.paidAt} - ${inv.issueDate} = ${days} days`);
    }
  }
  if (paidInvoices.length > 0) {
    console.log(`     = (sum of days) / ${paidInvoices.length} = ${summary.averageDaysToPay} days`);
  } else {
    console.log('     = No paid invoices');
  }
  console.log('');
}

generateReport().catch(console.error);

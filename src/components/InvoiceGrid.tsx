'use client';

import { useState, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';
import type { Invoice } from '@/db/schema';
import { formatCurrency, formatDate, getTodayString } from '@/lib/utils';
import { getInvoiceDisplayStatus, type DisplayStatus } from '@/lib/invoice-status';

interface InvoiceWithOverdue extends Invoice {
  isOverdue: boolean;
}

interface InvoiceGridProps {
  invoices: InvoiceWithOverdue[];
}

// Status cell renderer component
function StatusCellRenderer(props: ICellRendererParams) {
  const status = props.value as DisplayStatus | '';
  if (!status) return null;
  
  return (
    <span className={`status-badge status-${status}`}>
      {status.toUpperCase()}
    </span>
  );
}

export function InvoiceGrid({ invoices }: InvoiceGridProps) {
  const [quickFilterText, setQuickFilterText] = useState('');
  const today = getTodayString();

  // Format data for AG Grid
  const rowData = useMemo(() => {
    return invoices.map((invoice) => {
      const displayStatus = getInvoiceDisplayStatus(invoice, today);
      return {
        ...invoice,
        displayStatus,
        formattedAmount: formatCurrency(invoice.amountCents),
        formattedIssueDate: formatDate(invoice.issueDate),
        formattedDueDate: formatDate(invoice.dueDate),
      };
    });
  }, [invoices, today]);

  const columnDefs: ColDef[] = [
    {
      field: 'invoiceNumber',
      headerName: 'Number',
      width: 140,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'clientName',
      headerName: 'Client',
      width: 200,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      filter: 'agTextColumnFilter',
    },
    {
      field: 'amountCents',
      headerName: 'Amount',
      width: 140,
      type: 'numericColumn',
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: any) => {
        return formatCurrency(params.value);
      },
      cellClass: 'amount-cell',
    },
    {
      field: 'issueDate',
      headerName: 'Issued',
      width: 110,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => formatDate(params.value),
    },
    {
      field: 'dueDate',
      headerName: 'Due',
      width: 110,
      filter: 'agDateColumnFilter',
      cellRenderer: (params: any) => formatDate(params.value),
    },
    {
      field: 'displayStatus',
      headerName: 'Status',
      width: 120,
      filter: 'agTextColumnFilter',
      cellRenderer: StatusCellRenderer,
    },
  ];

  // Calculate totals for pinned row
  const pinnedBottomRowData = useMemo(() => {
    const total = rowData.reduce((sum, row) => {
      if (row.displayStatus !== 'void') {
        return sum + row.amountCents;
      }
      return sum;
    }, 0);

    return [
      {
        invoiceNumber: '',
        clientName: '',
        description: 'Total (excl. void)',
        amountCents: total,
        issueDate: '',
        dueDate: '',
        displayStatus: '',
      },
    ];
  }, [rowData]);

  return (
    <div className="grid-wrapper">
      <div className="grid-controls">
        <input
          type="text"
          placeholder="Quick search..."
          value={quickFilterText}
          onChange={(e) => setQuickFilterText(e.target.value)}
          className="quick-search"
        />
      </div>
      
      <div className="ag-theme-quartz" style={{ height: '100%', width: '100%' }}>
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          quickFilterText={quickFilterText}
          pinnedBottomRowData={pinnedBottomRowData}
          animateRows={true}
          domLayout="autoHeight"
        />
      </div>
    </div>
  );
}

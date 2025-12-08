'use client';

import React, { useState } from 'react';
import { InvoiceData } from '@/types';
import { Button } from '@/components/ui';
import { useResultsStore } from '@/stores/results-store';

interface ResultsTableProps {
  results: InvoiceData[];
}

export function ResultsTable({ results }: ResultsTableProps) {
  const {
    sortBy,
    sortOrder,
    searchTerm,
    setSortBy,
    toggleSortOrder,
    setSearchTerm,
  } = useResultsStore();

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredResults = results.filter(result => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      result.filename.toLowerCase().includes(term) ||
      result.orderNumber?.toLowerCase().includes(term) ||
      result.customerInfo?.name?.toLowerCase().includes(term)
    );
  });

  const sortedResults = [...filteredResults].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];

    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortOrder === 'asc' ? -1 : 1;
    if (bValue == null) return sortOrder === 'asc' ? 1 : -1;

    // Compare values
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    }

    // Fallback to string comparison
    const aStr = String(aValue);
    const bStr = String(bValue);
    const comparison = aStr.localeCompare(bStr);
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: keyof InvoiceData) => {
    if (sortBy === field) {
      toggleSortOrder();
    } else {
      setSortBy(field);
    }
  };

  const toggleRowExpansion = (filename: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedRows(newExpanded);
  };

  const getValidationStatusColor = (status: string) => {
    switch (status) {
    case 'valid':
      return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900';
    case 'warning':
      return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900';
    case 'error':
      return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900';
    default:
      return 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
    case 'valid':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  const SortableHeader = ({
    field,
    children,
    className = '',
  }: {
    field: keyof InvoiceData;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 ${className}`}
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortBy === field && (
          <svg
            className={`w-4 h-4 ${sortOrder === 'desc' ? 'transform rotate-180' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 010-1.414L5.293 7.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-neutral-400">
          Showing {sortedResults.length} of {results.length} results
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
          <thead className="bg-gray-50 dark:bg-neutral-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Expand
              </th>
              <SortableHeader field="filename">Filename</SortableHeader>
              <SortableHeader field="orderNumber">Order Number</SortableHeader>
              <SortableHeader field="orderDate">Date</SortableHeader>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Customer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Items
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
            {sortedResults.map((result) => (
              <React.Fragment key={result.filename}>
                <tr className="hover:bg-gray-50 dark:hover:bg-neutral-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(result.filename)}
                      aria-label={`${expandedRows.has(result.filename) ? 'Collapse' : 'Expand'} ${result.filename} details`}
                    >
                      <svg
                        className={`w-4 h-4 transform transition-transform ${expandedRows.has(result.filename) ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-neutral-100">
                    {result.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                    {result.orderNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                    {result.orderDate ? new Date(result.orderDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                    {result.customerInfo?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                    {result.items?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-neutral-100">
                    {result.totals?.total ? `${result.currency || 'USD'} ${result.totals.total.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getValidationStatusColor(result.validationStatus)}`}>
                      {getValidationStatusIcon(result.validationStatus)}
                      <span className="ml-1 capitalize">{result.validationStatus}</span>
                    </span>
                  </td>
                </tr>
                {expandedRows.has(result.filename) && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50 dark:bg-neutral-800">
                      <div className="space-y-4">
                        {/* JSON View */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">Raw Data (JSON)</h4>
                          <pre className="bg-gray-800 text-green-400 p-4 rounded-md text-xs overflow-x-auto max-h-96 overflow-y-auto">
                            {JSON.stringify(result, null, 2)}
                          </pre>
                        </div>

                        {/* Validation Errors */}
                        {result.validationErrors && result.validationErrors.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">Validation Errors</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {result.validationErrors.map((error, index) => (
                                <li key={index} className="text-sm text-red-700 dark:text-red-300">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Item Details */}
                        {result.items && result.items.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-neutral-100 mb-2">Items ({result.items.length})</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-300 dark:divide-neutral-600">
                                <thead className="bg-gray-100 dark:bg-neutral-700">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-neutral-300 uppercase">Description</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-neutral-300 uppercase">Qty</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-neutral-300 uppercase">Price</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-neutral-300 uppercase">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-neutral-700">
                                  {result.items.map((item, index) => (
                                    <tr key={index}>
                                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100">{item.description || '-'}</td>
                                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100">{item.quantity || '-'}</td>
                                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100">
                                        {item.unitPrice ? `${result.currency || 'USD'} ${item.unitPrice.toFixed(2)}` : '-'}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-gray-900 dark:text-neutral-100">
                                        {item.total ? `${result.currency || 'USD'} ${item.total.toFixed(2)}` : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {sortedResults.length === 0 && results.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-neutral-400">No results match your search criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchTerm('')}
            className="mt-2"
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
}

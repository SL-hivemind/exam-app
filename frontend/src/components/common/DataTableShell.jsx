import React from 'react';
import {
  Card, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Box,
} from '@mui/material';
import EmptyState from './EmptyState';
import LoadingState from './LoadingState';

/**
 * Styled table wrapper used by admin list pages. Renders a header row from
 * `columns` and delegates body rows to `renderRow`.
 *
 * columns: [{ key, label, align, width }]
 *
 * <DataTableShell columns={cols} rows={items} renderRow={(r) => (...)} />
 */
export default function DataTableShell({
  columns = [],
  rows = [],
  renderRow,
  loading = false,
  emptyTitle = 'Nothing here yet',
  emptyMessage,
  emptyAction,
  emptyIcon,
  size = 'medium',
  sx,
}) {
  return (
    <Card sx={{ overflow: 'hidden', ...sx }}>
      <TableContainer>
        <Table size={size} sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.key} align={col.align || 'left'} sx={{ width: col.width }}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          {!loading && rows.length > 0 && (
            <TableBody>{rows.map((row, i) => renderRow(row, i))}</TableBody>
          )}
        </Table>
      </TableContainer>

      {loading && <LoadingState />}
      {!loading && rows.length === 0 && (
        <Box sx={{ py: 1 }}>
          <EmptyState dense title={emptyTitle} message={emptyMessage} action={emptyAction} icon={emptyIcon} />
        </Box>
      )}
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Database, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Users,
  Calendar,
  Download,
  AlertCircle,
  Building2
} from 'lucide-react';

interface BiometricSite {
  id: string;
  name: string;
}

interface SyncLog {
  id: number;
  siteId?: string;
  lastRecord: string;
  syncType: string;
  recordsFetched: number;
  recordsProcessed: number;
  status: string;
  errorMessage?: string;
  createdAt: string;
}

interface RawLog {
  id: number;
  empCode: string;
  name: string;
  punchDate: string;
  deviceId?: string;
  siteId?: string;
  processed: boolean;
  createdAt: string;
}

interface SyncStatus {
  syncHistory: SyncLog[];
  unprocessedCount: number;
  lastSuccessfulSync?: SyncLog;
}

export default function BiometricPage() {
  const [sites, setSites] = useState<BiometricSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [rawLogs, setRawLogs] = useState<RawLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Date range sync
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dateRangeSyncing, setDateRangeSyncing] = useState(false);

  useEffect(() => {
    fetchSites();
    fetchSyncStatus();
    fetchRawLogs();
  }, [selectedSite]);

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/biometric/sync');
      const data = await response.json();
      if (data.success) {
        setSites(data.data);
      }
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const url = selectedSite && selectedSite !== 'all'
        ? `/api/biometric/sync-status?siteId=${selectedSite}`
        : '/api/biometric/sync-status';
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setSyncStatus(data.data);
      }
    } catch (error) {
      console.error('Error fetching sync status:', error);
    }
  };

  const fetchRawLogs = async (processed?: boolean) => {
    try {
      setLoading(true);
      let url = processed !== undefined 
        ? `/api/biometric/logs?processed=${processed}&limit=50`
        : '/api/biometric/logs?limit=50';
      
      if (selectedSite && selectedSite !== 'all') {
        url += `&siteId=${selectedSite}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setRawLogs(data.data);
      }
    } catch (error) {
      console.error('Error fetching raw logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementalSync = async () => {
    try {
      setSyncing(true);
      const siteText = selectedSite === 'all' ? 'all sites' : sites.find(s => s.id === selectedSite)?.name || selectedSite;
      toast.info(`Starting incremental sync for ${siteText}...`);
      
      const body = selectedSite !== 'all' ? { siteId: selectedSite } : {};
      
      const response = await fetch('/api/biometric/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (Array.isArray(data.data.sync)) {
          // Multiple sites
          const totalFetched = data.data.sync.reduce((sum: number, r: any) => sum + r.result.fetched, 0);
          const totalProcessed = data.data.processing.reduce((sum: number, r: any) => sum + r.result.processedCount, 0);
          
          if (totalFetched === 0) {
            toast.info(
              `No new data available.\n\nThis is normal - incremental sync only fetches NEW records since last sync.\n\nTo get new data:\n• Wait for employees to punch in/out today\n• Use Date Range Sync for specific dates`,
              { duration: 8000 }
            );
          } else {
            const summary = data.data.sync.map((r: any, i: number) => 
              `${r.site}: ${r.result.fetched} synced, ${data.data.processing[i].result.processedCount} processed`
            ).join('\n');
            toast.success(`Sync & Processing completed!\n${summary}`);
          }
        } else {
          // Single site
          const fetched = data.data.sync?.fetched || 0;
          const processed = data.data.processing?.processedCount || 0;
          
          if (fetched === 0) {
            toast.info(
              `No new data available.\n\nThis is normal - incremental sync only fetches NEW records since last sync.\n\nTo get new data:\n• Wait for employees to punch in/out today\n• Use Date Range Sync for specific dates`,
              { duration: 8000 }
            );
          } else {
            toast.success(`Sync & Processing completed! Fetched: ${fetched}, Processed: ${processed} employees`);
          }
        }
        fetchSyncStatus();
        fetchRawLogs();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const handleDateRangeSync = async () => {
    if (!fromDate || !toDate) {
      toast.error('Please select both from and to dates');
      return;
    }

    try {
      setDateRangeSyncing(true);
      toast.info('Starting date range sync...');
      
      const body: any = { fromDate, toDate };
      if (selectedSite !== 'all') {
        body.siteId = selectedSite;
      }
      
      const response = await fetch('/api/biometric/sync/date-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (Array.isArray(data.data)) {
          // Multiple sites
          const summary = data.data.map((r: any) => 
            `${r.site}: ${r.result.fetched} fetched, ${r.result.processed} processed`
          ).join('\n');
          toast.success(`Date range sync completed!\n${summary}`);
        } else {
          // Single site
          toast.success(`Date range sync completed! Fetched: ${data.data.fetched}, Processed: ${data.data.processed}`);
        }
        fetchSyncStatus();
        fetchRawLogs();
      } else {
        toast.error(data.error || 'Date range sync failed');
      }
    } catch (error) {
      toast.error('Date range sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setDateRangeSyncing(false);
    }
  };

  const handleProcessLogs = async () => {
    try {
      setProcessing(true);
      toast.info('Processing raw logs...');
      
      const response = await fetch('/api/biometric/process', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        const { processedCount, processedEmployees } = data.data;
        
        // Show summary with employee names
        if (processedEmployees && processedEmployees.length > 0) {
          const employeeList = processedEmployees
            .slice(0, 10)
            .map((emp: any) => `${emp.name} (${emp.empCode}): ${emp.recordsCount} records`)
            .join('\n');
          
          const moreText = processedEmployees.length > 10 
            ? `\n...and ${processedEmployees.length - 10} more employees` 
            : '';
          
          toast.success(
            `Processing completed!\n\nProcessed ${processedCount} records for ${processedEmployees.length} employees:\n\n${employeeList}${moreText}`,
            { duration: 10000 }
          );
        } else {
          toast.success(`Processing completed! Processed: ${processedCount} records`);
        }
        
        fetchSyncStatus();
        fetchRawLogs();
      } else {
        toast.error(data.error || 'Processing failed');
      }
    } catch (error) {
      toast.error('Processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Biometric Integration</h1>
          <p className="text-sm text-gray-400 mt-1">Manage biometric device sync and attendance data</p>
        </div>
        <div className="flex gap-3 items-center">
          {sites.length > 0 && (
            <Select value={selectedSite} onValueChange={setSelectedSite}>
              <SelectTrigger className="w-[180px] bg-[#161b22] border-[#30363d]">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select site" />
              </SelectTrigger>
              <SelectContent className="bg-[#161b22] border-[#30363d]">
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((site) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button 
            onClick={handleIncrementalSync} 
            disabled={syncing}
            className="bg-[#f5a623] hover:bg-[#f5a623]/90"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Unprocessed Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {syncStatus?.unprocessedCount || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white">
              {syncStatus?.lastSuccessfulSync 
                ? new Date(syncStatus.lastSuccessfulSync.createdAt).toLocaleTimeString()
                : 'Never'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Last Fetched
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {syncStatus?.lastSuccessfulSync?.recordsFetched || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#161b22] border-[#30363d]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Last Processed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {syncStatus?.lastSuccessfulSync?.recordsProcessed || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sync" className="space-y-4">
        <TabsList className="bg-[#161b22] border border-[#30363d]">
          <TabsTrigger value="sync">Sync Operations</TabsTrigger>
          <TabsTrigger value="logs">Raw Logs</TabsTrigger>
          <TabsTrigger value="history">Sync History</TabsTrigger>
        </TabsList>

        {/* Sync Operations Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-white">Incremental Sync</CardTitle>
              <CardDescription>Fetch new punch data since last sync (Recommended)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleIncrementalSync} 
                  disabled={syncing}
                  className="bg-[#f5a623] hover:bg-[#f5a623]/90"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Run Incremental Sync
                    </>
                  )}
                </Button>
                <div className="text-sm text-gray-400">
                  Fetches only new records since last sync
                  {selectedSite !== 'all' && ` for ${sites.find(s => s.id === selectedSite)?.name}`}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-white">Date Range Sync</CardTitle>
              <CardDescription>Sync specific date range (for backfilling)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromDate" className="text-gray-300">From Date</Label>
                  <Input
                    id="fromDate"
                    type="text"
                    placeholder="dd/MM/yyyy_HH:mm"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-[#0d1117] border-[#30363d] text-white"
                  />
                  <p className="text-xs text-gray-500">Format: 01/04/2026_00:00</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="toDate" className="text-gray-300">To Date</Label>
                  <Input
                    id="toDate"
                    type="text"
                    placeholder="dd/MM/yyyy_HH:mm"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-[#0d1117] border-[#30363d] text-white"
                  />
                  <p className="text-xs text-gray-500">Format: 30/04/2026_23:59</p>
                </div>
              </div>
              <Button 
                onClick={handleDateRangeSync} 
                disabled={dateRangeSyncing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {dateRangeSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Sync Date Range
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-white">Process Unmatched Logs</CardTitle>
              <CardDescription>
                Matched employee logs are processed automatically during sync. 
                Use this to retry processing logs for employees not found in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button 
                  onClick={handleProcessLogs} 
                  disabled={processing || (syncStatus?.unprocessedCount || 0) === 0}
                  variant="outline"
                  className="border-[#30363d] hover:bg-[#30363d]"
                >
                  {processing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Retry Unmatched ({syncStatus?.unprocessedCount || 0})
                    </>
                  )}
                </Button>
                <div className="text-sm text-gray-400">
                  Attempts to process logs for employees not found during sync
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Raw Biometric Logs</CardTitle>
                  <CardDescription>View punch data from biometric devices</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fetchRawLogs()}
                    className="border-[#30363d]"
                  >
                    All
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fetchRawLogs(false)}
                    className="border-[#30363d]"
                  >
                    Unprocessed
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fetchRawLogs(true)}
                    className="border-[#30363d]"
                  >
                    Processed
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#30363d]">
                        <TableHead className="text-gray-400">Site</TableHead>
                        <TableHead className="text-gray-400">Employee Code</TableHead>
                        <TableHead className="text-gray-400">Name</TableHead>
                        <TableHead className="text-gray-400">Punch Date</TableHead>
                        <TableHead className="text-gray-400">Device ID</TableHead>
                        <TableHead className="text-gray-400">Status</TableHead>
                        <TableHead className="text-gray-400">Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rawLogs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                            No logs found
                          </TableCell>
                        </TableRow>
                      ) : (
                        rawLogs.map((log) => (
                          <TableRow key={log.id} className="border-[#30363d]">
                            <TableCell>
                              <Badge variant="outline" className="border-blue-600 text-blue-600">
                                {log.siteId || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-mono">{log.empCode}</TableCell>
                            <TableCell className="text-white">{log.name}</TableCell>
                            <TableCell className="text-gray-300">{formatDate(log.punchDate)}</TableCell>
                            <TableCell className="text-gray-300">{log.deviceId || '-'}</TableCell>
                            <TableCell>
                              {log.processed ? (
                                <Badge className="bg-green-600">Processed</Badge>
                              ) : (
                                <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-gray-400 text-sm">
                              {formatDate(log.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="bg-[#161b22] border-[#30363d]">
            <CardHeader>
              <CardTitle className="text-white">Sync History</CardTitle>
              <CardDescription>View past sync operations and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#30363d]">
                      <TableHead className="text-gray-400">Site</TableHead>
                      <TableHead className="text-gray-400">Date/Time</TableHead>
                      <TableHead className="text-gray-400">Type</TableHead>
                      <TableHead className="text-gray-400">Fetched</TableHead>
                      <TableHead className="text-gray-400">Processed</TableHead>
                      <TableHead className="text-gray-400">Status</TableHead>
                      <TableHead className="text-gray-400">Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!syncStatus?.syncHistory || syncStatus.syncHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                          No sync history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncStatus.syncHistory.map((log) => (
                        <TableRow key={log.id} className="border-[#30363d]">
                          <TableCell>
                            <Badge variant="outline" className="border-blue-600 text-blue-600">
                              {log.siteId || 'All'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{formatDate(log.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-purple-600 text-purple-600">
                              {log.syncType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{log.recordsFetched}</TableCell>
                          <TableCell className="text-white">{log.recordsProcessed}</TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-red-400 text-sm">
                            {log.errorMessage || '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

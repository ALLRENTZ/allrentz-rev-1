import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Package, 
  Activity,
  AlertCircle,
  CheckCircle,
  Calendar,
  Target,
  RefreshCw,
  Download,
  Eye,
  Star,
  Zap,
  Shield,
  PieChart,
  LineChart,
  ArrowUp,
  ArrowDown,
  Trophy
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { 
  analyticsService,
  OperationalMetrics,
  RevenueAnalytics,
  UtilizationAnalytics,
  CustomerAnalytics,
  ComplianceMetrics
} from '@/services/analyticsService';

interface OperationalInsightsDashboardProps {
  vendorId?: string;
  userRole?: 'vendor' | 'admin' | 'manager';
}

const OperationalInsightsDashboard: React.FC<OperationalInsightsDashboardProps> = ({ 
  vendorId, 
  userRole = 'vendor' 
}) => {
  const [timeRange, setTimeRange] = useState<'30' | '90' | '180' | '365'>('90');
  const [selectedMetric, setSelectedMetric] = useState<string>('overview');

  // Fetch operational metrics
  const { data: operationalMetrics, isLoading: loadingOperational } = useQuery({
    queryKey: ['operational-metrics', vendorId, timeRange],
    queryFn: () => analyticsService.getOperationalMetrics(vendorId, parseInt(timeRange)),
    refetchInterval: 30 * 60 * 1000 // Refresh every 30 minutes
  });

  // Fetch revenue analytics
  const { data: revenueAnalytics, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-analytics', vendorId],
    queryFn: () => analyticsService.getRevenueAnalytics(vendorId, 12),
    refetchInterval: 60 * 60 * 1000 // Refresh every hour
  });

  // Fetch utilization analytics
  const { data: utilizationAnalytics, isLoading: loadingUtilization } = useQuery({
    queryKey: ['utilization-analytics', vendorId, timeRange],
    queryFn: () => analyticsService.getUtilizationAnalytics(vendorId, parseInt(timeRange)),
    refetchInterval: 30 * 60 * 1000
  });

  // Fetch customer analytics
  const { data: customerAnalytics, isLoading: loadingCustomer } = useQuery({
    queryKey: ['customer-analytics', vendorId],
    queryFn: () => analyticsService.getCustomerAnalytics(vendorId),
    refetchInterval: 60 * 60 * 1000
  });

  // Fetch compliance metrics
  const { data: complianceMetrics, isLoading: loadingCompliance } = useQuery({
    queryKey: ['compliance-metrics', vendorId],
    queryFn: () => analyticsService.getComplianceMetrics(vendorId),
    refetchInterval: 2 * 60 * 60 * 1000 // Refresh every 2 hours
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100) / 100}%`;
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4" />;
    if (growth < 0) return <ArrowDown className="h-4 w-4" />;
    return null;
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loadingOperational && loadingRevenue && loadingUtilization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 animate-pulse text-allrentz-red mx-auto mb-4" />
          <p className="text-gray-600">Loading operational insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operational Insights</h1>
          <p className="text-gray-600 mt-2">Comprehensive analytics and performance metrics</p>
        </div>
        <div className="flex space-x-2 mt-4 md:mt-0">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {operationalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Equipment</p>
                  <p className="text-2xl font-bold">{operationalMetrics.totalEquipment}</p>
                </div>
                <Package className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Rentals</p>
                  <p className="text-2xl font-bold text-green-600">{operationalMetrics.activeRentals}</p>
                </div>
                <Activity className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Utilization Rate</p>
                  <p className={`text-2xl font-bold ${getUtilizationColor(operationalMetrics.avgUtilizationRate)}`}>
                    {operationalMetrics.avgUtilizationRate}%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(operationalMetrics.totalRevenue)}
                  </p>
                  <div className={`flex items-center text-sm ${getGrowthColor(operationalMetrics.revenueGrowth)}`}>
                    {getGrowthIcon(operationalMetrics.revenueGrowth)}
                    <span className="ml-1">{formatPercent(operationalMetrics.revenueGrowth)}</span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Customer Satisfaction</p>
                  <p className="text-2xl font-bold text-yellow-600">{operationalMetrics.customerSatisfaction}/5</p>
                  <div className="flex text-yellow-500 text-sm">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-3 w-3 ${i < operationalMetrics.customerSatisfaction ? 'fill-current' : ''}`} 
                      />
                    ))}
                  </div>
                </div>
                <Star className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Equipment Condition</p>
                  <p className="text-2xl font-bold text-blue-600">{operationalMetrics.equipmentConditionScore}/100</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Categories */}
            {operationalMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Top Performing Categories</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {operationalMetrics.topCategories.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-allrentz-red text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold">{category.category}</h3>
                            <p className="text-sm text-gray-600">{category.totalEquipment} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(category.revenue)}</p>
                          <p className="text-sm text-gray-600">{category.utilizationRate}% utilization</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue Trends */}
            {revenueAnalytics && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <LineChart className="h-5 w-5" />
                    <span>Revenue Trends</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">This Month Projection</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(revenueAnalytics.revenueProjection)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">YTD Revenue</p>
                        <p className="text-xl font-bold">{formatCurrency(revenueAnalytics.totalRevenue)}</p>
                      </div>
                    </div>
                    
                    {/* Monthly Revenue Chart (Simplified) */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Last 6 Months</h4>
                      {revenueAnalytics.revenueByMonth.slice(-6).map((month, index) => (
                        <div key={month.month} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {new Date(month.month + '-01').toLocaleDateString('en-US', { month: 'short' })}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min(100, (month.revenue / Math.max(...revenueAnalytics.revenueByMonth.map(m => m.revenue))) * 100)}%` 
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{formatCurrency(month.revenue)}</span>
                            {month.growth !== 0 && (
                              <div className={`flex items-center ${getGrowthColor(month.growth)}`}>
                                {getGrowthIcon(month.growth)}
                                <span className="text-xs">{formatPercent(month.growth)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Utilization Overview */}
          {utilizationAnalytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Utilization by Category</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {utilizationAnalytics.utilizationByCategory.map((category) => (
                    <div key={category.category} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{category.category}</h3>
                        <Badge className={category.utilization >= 80 ? 'bg-green-100 text-green-800' : 
                                       category.utilization >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                                       'bg-red-100 text-red-800'}>
                          {category.utilization}%
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Equipment Count:</span>
                          <span>{category.equipment_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Efficiency:</span>
                          <span>{category.efficiency}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rental Hours:</span>
                          <span>{category.rentalHours.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* Utilization Bar */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${category.utilization}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Peak Usage Insights */}
          {utilizationAnalytics && utilizationAnalytics.peakUsagePeriods && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Peak Usage Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-3 text-green-800">High Demand Periods</h3>
                    <div className="space-y-2">
                      {utilizationAnalytics.peakUsagePeriods.map((period, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                          <span className="font-medium">{period.period}</span>
                          <div className="text-right">
                            <p className="text-sm text-green-800">{period.utilization}% utilization</p>
                            <p className="text-xs text-gray-600">{formatCurrency(period.avgRate)} avg rate</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3 text-orange-800">Optimization Opportunities</h3>
                    <div className="space-y-2">
                      {utilizationAnalytics.lowUsagePeriods.map((period, index) => (
                        <div key={index} className="p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{period.period}</span>
                            <span className="text-sm text-orange-800">{period.utilization}% utilization</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            <p className="mb-1">Opportunity: +{period.opportunity}% potential</p>
                            <div className="space-y-1">
                              {period.suggestedActions.slice(0, 2).map((action, i) => (
                                <p key={i}>• {action}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          {revenueAnalytics && (
            <>
              {/* Revenue Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(revenueAnalytics.totalRevenue)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Monthly Projection</p>
                        <p className="text-xl font-bold text-blue-600">
                          {formatCurrency(revenueAnalytics.revenueProjection)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Top Category</p>
                        <p className="text-lg font-bold">
                          {revenueAnalytics.revenueByCategory[0]?.category || 'N/A'}
                        </p>
                        <p className="text-sm text-green-600">
                          {revenueAnalytics.revenueByCategory[0] ? 
                            formatPercent(revenueAnalytics.revenueByCategory[0].percentage) : '0%'
                          }
                        </p>
                      </div>
                      <PieChart className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Seasonal Factor</p>
                        <p className="text-xl font-bold text-orange-600">Q3</p>
                        <p className="text-sm text-gray-600">Peak season</p>
                      </div>
                      <Calendar className="h-8 w-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue by Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Equipment Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueAnalytics.revenueByCategory.map((category, index) => (
                      <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{category.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(category.revenue)}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{formatPercent(category.percentage)}</span>
                            <div className={`flex items-center ${getGrowthColor(category.growth)}`}>
                              {getGrowthIcon(category.growth)}
                              <span className="text-xs">{formatPercent(category.growth)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Revenue Generating Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {revenueAnalytics.topCustomers.slice(0, 5).map((customer, index) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold">{customer.customerName}</h3>
                            <p className="text-sm text-gray-600">{customer.bookings} bookings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(customer.revenue)}</p>
                          <p className="text-sm text-gray-600">
                            Avg: {formatCurrency(customer.avgBookingValue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="utilization" className="space-y-6">
          {utilizationAnalytics && (
            <>
              {/* Utilization Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Overall Utilization</p>
                        <p className={`text-2xl font-bold ${getUtilizationColor(utilizationAnalytics.overallUtilization)}`}>
                          {utilizationAnalytics.overallUtilization}%
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Peak Utilization</p>
                        <p className="text-2xl font-bold text-green-600">
                          {Math.max(...utilizationAnalytics.utilizationByCategory.map(c => c.utilization))}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {utilizationAnalytics.utilizationByCategory
                            .find(c => c.utilization === Math.max(...utilizationAnalytics.utilizationByCategory.map(cat => cat.utilization)))
                            ?.category}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Efficiency Score</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.round(utilizationAnalytics.utilizationByCategory.reduce((sum, c) => sum + c.efficiency, 0) / utilizationAnalytics.utilizationByCategory.length)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Utilization Forecast */}
              <Card>
                <CardHeader>
                  <CardTitle>Utilization Forecast (Next 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {utilizationAnalytics.utilizationForecast.map((forecast) => (
                      <div key={forecast.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{forecast.month}</span>
                          <Badge variant="outline">
                            {Math.round(forecast.confidence)}% confidence
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{Math.round(forecast.predictedUtilization)}%</p>
                          <p className="text-xs text-gray-600">
                            Based on: {forecast.factors.slice(0, 2).join(', ')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {customerAnalytics && (
            <>
              {/* Customer Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Customers</p>
                        <p className="text-2xl font-bold">{customerAnalytics.totalCustomers}</p>
                      </div>
                      <Users className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Customers</p>
                        <p className="text-2xl font-bold text-green-600">{customerAnalytics.activeCustomers}</p>
                      </div>
                      <Activity className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Retention Rate</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatPercent(customerAnalytics.customerRetention)}
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Lifetime Value</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(customerAnalytics.customerLifetimeValue)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Segments */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {customerAnalytics.customerSegments.map((segment) => (
                      <div key={segment.segment} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-lg">{segment.segment}</h3>
                          <Badge variant="outline">{segment.count} customers</Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Avg Revenue:</span>
                            <span className="font-medium">{formatCurrency(segment.avgRevenue)}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p className="font-medium mb-1">Characteristics:</p>
                            <ul className="space-y-1">
                              {segment.characteristics.map((char, index) => (
                                <li key={index}>• {char}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Customers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers by Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {customerAnalytics.topCustomers.slice(0, 5).map((customer, index) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold">{customer.customerName}</h3>
                            <p className="text-sm text-gray-600">{customer.company}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(customer.totalSpent)}</p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <span>{customer.bookingsCount} bookings</span>
                            <Badge variant="outline">
                              {Math.round(customer.loyaltyScore)} loyalty
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Churn Risk */}
              {customerAnalytics.churnRisk.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span>Customers at Risk</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {customerAnalytics.churnRisk.slice(0, 3).map((customer) => (
                        <div key={customer.customerId} className="p-3 border border-orange-200 bg-orange-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{customer.customerName}</h3>
                              <p className="text-sm text-gray-600">{customer.company}</p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-800">
                              {customer.riskScore}% risk
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Last booking: {new Date(customer.lastBooking).toLocaleDateString()}</p>
                            <p>Reasons: {customer.reasons.join(', ')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          {complianceMetrics && (
            <>
              {/* Compliance Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Overall Score</p>
                        <p className={`text-2xl font-bold ${getComplianceColor(complianceMetrics.overallComplianceScore)}`}>
                          {complianceMetrics.overallComplianceScore}/100
                        </p>
                      </div>
                      <Shield className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Critical Issues</p>
                        <p className="text-2xl font-bold text-red-600">
                          {complianceMetrics.complianceIssues.filter(i => i.severity === 'critical').length}
                        </p>
                      </div>
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Maintenance Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatPercent(complianceMetrics.maintenanceCompliance.onTimeRate)}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Safety Score</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {complianceMetrics.safetyMetrics.safetyScore}/100
                        </p>
                      </div>
                      <Star className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Certification Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Certification Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceMetrics.certificationStatus.map((cert) => (
                      <div key={cert.certificationType} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{cert.certificationType}</h3>
                          <Badge className={cert.complianceRate >= 95 ? 'bg-green-100 text-green-800' : 
                                          cert.complianceRate >= 85 ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800'}>
                            {formatPercent(cert.complianceRate)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Valid</p>
                            <p className="font-bold text-green-600">{cert.currentValid}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Expiring Soon</p>
                            <p className="font-bold text-yellow-600">{cert.expiringSoon}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Expired</p>
                            <p className="font-bold text-red-600">{cert.expired}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="font-bold">{cert.totalRequired}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Issues */}
              {complianceMetrics.complianceIssues.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-500" />
                      <span>Critical Compliance Issues</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {complianceMetrics.complianceIssues
                        .filter(issue => issue.severity === 'critical' || issue.severity === 'high')
                        .slice(0, 5)
                        .map((issue) => (
                        <div key={issue.issueId} className="p-3 border border-red-200 bg-red-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{issue.equipmentName}</h3>
                              <p className="text-sm text-gray-600">{issue.issueType}</p>
                            </div>
                            <Badge className={issue.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>
                              {issue.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span>Due: {new Date(issue.dueDate).toLocaleDateString()}</span>
                            {issue.daysOverdue && (
                              <span className="text-red-600 font-medium">
                                {issue.daysOverdue} days overdue
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Audits */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Audit Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {complianceMetrics.auditResults.map((audit, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{audit.auditType}</h3>
                            <p className="text-sm text-gray-600">
                              {new Date(audit.auditDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={audit.score >= 95 ? 'bg-green-100 text-green-800' : 
                                          audit.score >= 85 ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-red-100 text-red-800'}>
                            {audit.score}/100
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-700 space-y-1">
                          {audit.findings.map((finding, i) => (
                            <p key={i}>• {finding}</p>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-green-600">
                            {audit.correctedIssues} issues corrected
                          </span>
                          {audit.pendingIssues > 0 && (
                            <span className="text-orange-600">
                              {audit.pendingIssues} pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OperationalInsightsDashboard;
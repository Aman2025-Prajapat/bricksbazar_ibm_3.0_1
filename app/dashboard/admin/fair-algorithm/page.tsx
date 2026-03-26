"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, TrendingUp, Users, MapPin, Award, DollarSign, BarChart3 } from "lucide-react"

export default function FairAlgorithmPage() {
  const [config, setConfig] = useState({
    localBoost: 30,
    verificationWeight: 20,
    ratingWeight: 25,
    proximityWeight: 15,
    priceWeight: 10,
  })

  const [stats] = useState({
    totalSuppliers: 1247,
    localSuppliers: 623,
    distributors: 324,
    verifiedSuppliers: 891,
    averageFairnessScore: 0.72,
    localSupportPercentage: 45,
    communityImpact: 2.3, // million rupees
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fair Algorithm Management</h1>
        <p className="text-muted-foreground">
          Configure and monitor the Fair Algorithm that balances big distributors vs local retailers
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="impact">Impact Analysis</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                    <p className="text-2xl font-bold">{stats.totalSuppliers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Local Suppliers</p>
                    <p className="text-2xl font-bold">{stats.localSuppliers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Fairness Score</p>
                    <p className="text-2xl font-bold">{Math.round(stats.averageFairnessScore * 100)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Community Impact</p>
                    <p className="text-2xl font-bold">₹{stats.communityImpact}M</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Algorithm Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Fair Algorithm Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Local Boost</span>
                      <span className="text-sm text-muted-foreground">{config.localBoost}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${config.localBoost}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Verification Weight</span>
                      <span className="text-sm text-muted-foreground">{config.verificationWeight}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${config.verificationWeight}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Rating Weight</span>
                      <span className="text-sm text-muted-foreground">{config.ratingWeight}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${config.ratingWeight}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Local First Policy</h4>
                      <p className="text-sm text-green-700">
                        {stats.localSupportPercentage}% of orders go to local suppliers
                      </p>
                      <Badge className="mt-2 bg-green-500">Active</Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-blue-800 mb-2">Dynamic Commission</h4>
                      <p className="text-sm text-blue-700">Lower rates for local suppliers, higher for distributors</p>
                      <Badge className="mt-2 bg-blue-500">Active</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Algorithm Configuration</CardTitle>
              <CardDescription>
                Adjust the Fair Algorithm parameters to balance local vs distributor preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="localBoost">Local Boost ({config.localBoost}%)</Label>
                    <Slider
                      id="localBoost"
                      min={0}
                      max={50}
                      step={5}
                      value={[config.localBoost]}
                      onValueChange={(value) => setConfig({ ...config, localBoost: value[0] })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Extra score boost for local suppliers</p>
                  </div>

                  <div>
                    <Label htmlFor="verificationWeight">Verification Weight ({config.verificationWeight}%)</Label>
                    <Slider
                      id="verificationWeight"
                      min={0}
                      max={40}
                      step={5}
                      value={[config.verificationWeight]}
                      onValueChange={(value) => setConfig({ ...config, verificationWeight: value[0] })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Weight given to verified suppliers</p>
                  </div>

                  <div>
                    <Label htmlFor="ratingWeight">Rating Weight ({config.ratingWeight}%)</Label>
                    <Slider
                      id="ratingWeight"
                      min={0}
                      max={40}
                      step={5}
                      value={[config.ratingWeight]}
                      onValueChange={(value) => setConfig({ ...config, ratingWeight: value[0] })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Weight given to supplier ratings</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="proximityWeight">Proximity Weight ({config.proximityWeight}%)</Label>
                    <Slider
                      id="proximityWeight"
                      min={0}
                      max={30}
                      step={5}
                      value={[config.proximityWeight]}
                      onValueChange={(value) => setConfig({ ...config, proximityWeight: value[0] })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Weight given to supplier distance</p>
                  </div>

                  <div>
                    <Label htmlFor="priceWeight">Price Weight ({config.priceWeight}%)</Label>
                    <Slider
                      id="priceWeight"
                      min={0}
                      max={25}
                      step={5}
                      value={[config.priceWeight]}
                      onValueChange={(value) => setConfig({ ...config, priceWeight: value[0] })}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Weight given to price competitiveness (kept low for fairness)
                    </p>
                  </div>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-yellow-800 mb-2">Configuration Impact</h4>
                      <p className="text-sm text-yellow-700">
                        Total Weight: {Object.values(config).reduce((a, b) => a + b, 0)}%
                      </p>
                      <p className="text-xs text-yellow-600 mt-1">Recommended total: 80-120% for optimal balance</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="flex gap-4">
                <Button>Save Configuration</Button>
                <Button variant="outline">Reset to Default</Button>
                <Button variant="outline">Preview Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Community Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Local Business Support</span>
                    <Badge className="bg-green-500">₹{stats.communityImpact}M</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Jobs Created</span>
                    <Badge variant="outline">1,247</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Carbon Footprint Reduced</span>
                    <Badge variant="outline">23%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Algorithm Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">User Satisfaction</span>
                    <Badge className="bg-blue-500">94%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Fair Choice Adoption</span>
                    <Badge variant="outline">78%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Local Supplier Growth</span>
                    <Badge variant="outline">+32%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier Verification & Trust Badges</CardTitle>
              <CardDescription>Manage supplier verification status and trust badges</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Input placeholder="Search suppliers..." className="flex-1" />
                  <Button>Verify Supplier</Button>
                  <Button variant="outline">Bulk Actions</Button>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  Supplier management interface would be implemented here
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

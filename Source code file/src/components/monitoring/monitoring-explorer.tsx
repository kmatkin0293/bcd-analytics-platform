"use client";

import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { RuntimeFilterOp } from "@thoughtspot/visual-embed-sdk";
import { LiveboardEmbed } from "@thoughtspot/visual-embed-sdk/react";
import * as d3 from "d3";
import { useCallback, useEffect, useRef, useState } from "react";
import { feature as topojsonFeature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FacilityCountriesResponse } from "@/app/api/monitoring/facility-countries/route";
import { ChakraButtonEl, ChakraSvg } from "@/components/chakra-elements";
import { Portal } from "@/components/motion/portal";
import { useThoughtSpotAuth } from "@/components/thoughtspot/thoughtspot-auth-provider";
import { VeraChat } from "@/components/vera/vera-chat";
import {
  THOUGHTSPOT_COMPLETION_RATE_TREND_VIZ_ID,
  THOUGHTSPOT_LIVEBOARD_COUNTRY_STATS_ID,
  THOUGHTSPOT_PRIVACY_COLUMN_IDS,
} from "@/config";
import {
  buildCountryIndex,
  type CountryIndex,
  type CountryRow,
  colorForCount,
  formatCurrency,
  MONITORING_RAMP,
  MONITORING_STEP_LABELS,
  normalizeCountryName,
} from "@/lib/monitoring-data";
import { HostEvent } from "@thoughtspot/visual-embed-sdk";
import { useEmbedRef } from "@thoughtspot/visual-embed-sdk/react";

const FILTER_COLUMNS = [
  { label: "Date", columnId: THOUGHTSPOT_PRIVACY_COLUMN_IDS.date },
  { label: "Region", columnId: THOUGHTSPOT_PRIVACY_COLUMN_IDS.region },
  { label: "Regulation Name", columnId: THOUGHTSPOT_PRIVACY_COLUMN_IDS.regulationName },
  { label: "Risk Level", columnId: THOUGHTSPOT_PRIVACY_COLUMN_IDS.riskLevel },
  { label: "Compliance Status", columnId: THOUGHTSPOT_PRIVACY_COLUMN_IDS.complianceStatus },
];

type CountryFeature = GeoJSON.Feature<GeoJSON.Geometry, { name: string }>;

const MAP_W = 960;
const MAP_H = 500;
const TOPOLOGY_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

type TooltipState = {
  visible: boolean;
  below: boolean;
  x: number;
  y: number;
  title: string;
  body: string;
};

const HIDDEN_TOOLTIP: TooltipState = {
  visible: false,
  below: false,
  x: 0,
  y: 0,
  title: "",
  body: "",
};

export function MonitoringExplorer() {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>(HIDDEN_TOOLTIP);
  const [mapStatus, setMapStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [dataStatus, setDataStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [countryIndex, setCountryIndex] = useState<CountryIndex | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/monitoring/facility-countries")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return (await res.json()) as FacilityCountriesResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setCountryIndex(buildCountryIndex(data.rows, data.nullCount));
        setDataStatus("ready");
      })
      .catch((error) => {
        console.error("Failed to load facility-country data", error);
        if (!cancelled) setDataStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const mapRowRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const featureKeyRef = useRef<Map<CountryFeature, string | null>>(new Map());
  const selectedKeyRef = useRef(selectedKey);
  const detailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
  }, [selectedKey]);

  useEffect(() => {
    if (selectedKey) {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedKey]);

  const selected = selectedKey
    ? (countryIndex?.byNorm.get(selectedKey) ?? null)
    : null;
  const isNullSelection = selected?.isNull ?? false;

  useEffect(() => {
    const svgEl = svgRef.current;
    const mapRowEl = mapRowRef.current;
    if (!svgEl || !mapRowEl || !countryIndex) return;
    const byNorm = countryIndex.byNorm;
    const total = countryIndex.total;

    let cancelled = false;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();
    const g = svg.append("g");
    const projection = d3.geoNaturalEarth1();
    const path = d3.geoPath(projection);

    const applySelection = (key: string | null) => {
      svg
        .selectAll<SVGPathElement, CountryFeature>("path.country")
        .classed(
          "sel",
          (d) => key !== null && featureKeyRef.current.get(d) === key,
        );
    };

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 9])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        g.selectAll("path.country").attr(
          "stroke-width",
          0.5 / event.transform.k,
        );
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    type CountriesTopology = Topology<{
      countries: GeometryCollection<{ name: string }>;
    }>;

    d3.json<CountriesTopology>(TOPOLOGY_URL)
      .then((topology) => {
        if (cancelled || !topology) return;
        const countries = topojsonFeature(
          topology,
          topology.objects.countries,
        ) as unknown as { features: CountryFeature[] };

        projection.fitExtent(
          [
            [8, 8],
            [MAP_W - 8, MAP_H - 8],
          ],
          { type: "Sphere" },
        );

        g.append("path")
          .attr("fill", "#FBF7E8")
          .attr("stroke", "#E6D8B4")
          .attr("d", path({ type: "Sphere" }));
        g.append("path")
          .attr("fill", "none")
          .attr("stroke", "#EFE2C0")
          .attr("stroke-width", 0.5)
          .attr("d", path(d3.geoGraticule10()));

        featureKeyRef.current = new Map();

        g.selectAll<SVGPathElement, CountryFeature>("path.country")
          .data(countries.features)
          .join("path")
          .attr("class", (d) => {
            const rec = byNorm.get(normalizeCountryName(d.properties.name));
            if (rec) {
              featureKeyRef.current.set(d, normalizeCountryName(rec.name));
            } else {
              featureKeyRef.current.set(d, null);
            }
            return `country${rec ? "" : " nodata"}`;
          })
          .attr("fill", (d) => {
            const rec = byNorm.get(normalizeCountryName(d.properties.name));
            return colorForCount(rec ? rec.value : null);
          })
          .attr("d", path)
          .on("mousemove", (event: MouseEvent, d) => {
            const rec = byNorm.get(normalizeCountryName(d.properties.name));
            const box = mapRowEl.getBoundingClientRect();
            const x = event.clientX - box.left;
            const y = event.clientY - box.top;
            setTooltip({
              visible: true,
              below: y < 60,
              x: Math.min(box.width - 12, Math.max(12, x)),
              y,
              title: rec ? rec.name : d.properties.name,
              body: rec
                ? `${formatCurrency(rec.value)} at risk · ${((rec.value / total) * 100).toFixed(rec.value / total < 0.01 ? 2 : 1)}% of global`
                : "No reported exposure",
            });
          })
          .on("mouseleave", () => {
            setTooltip((prev) => ({ ...prev, visible: false }));
          })
          .on("click", (_event: MouseEvent, d) => {
            const rec = byNorm.get(normalizeCountryName(d.properties.name));
            if (rec) setSelectedKey(normalizeCountryName(rec.name));
          });

        applySelection(selectedKeyRef.current);
        setMapStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMapStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [countryIndex]);

  useEffect(() => {
    if (mapStatus !== "ready" || !svgRef.current) return;
    d3.select(svgRef.current)
      .selectAll<SVGPathElement, CountryFeature>("path.country")
      .classed(
        "sel",
        (d) =>
          selectedKey !== null && featureKeyRef.current.get(d) === selectedKey,
      );
  }, [selectedKey, mapStatus]);

  const handleReset = () => {
    setSelectedKey(null);
    const svgEl = svgRef.current;
    const zoom = zoomRef.current;
    if (!svgEl || !zoom) return;
    d3.select(svgEl)
      .transition()
      .duration(500)
      .call(zoom.transform, d3.zoomIdentity);
  };

  const eyebrowLabel = selected
    ? `Monitoring · ${isNullSelection ? "unattributed exposure" : selected.name}`
    : "Monitoring · global risk exposure";

  return (
    <>
      <Flex
        align="center"
        gap="11px"
        fontFamily="mono"
        fontSize="11.5px"
        letterSpacing="0.12em"
        textTransform="uppercase"
        color="fg.muted"
      >
        <Box
          w="6px"
          h="6px"
          borderRadius="full"
          bg="gt.500"
          animation="blip 1.7s ease-in-out infinite"
        />
        <span>{eyebrowLabel}</span>
      </Flex>

      <Heading
        as="h1"
        mt="16px"
        fontSize={{ base: "32px", md: "54px" }}
        lineHeight="0.98"
        letterSpacing="-0.048em"
        fontWeight="800"
        color="fg.default"
      >
        Where the risk is concentrated
      </Heading>
      <Text
        mt="14px"
        fontSize="16.5px"
        lineHeight="1.55"
        color="fg.body"
        maxW="62ch"
      >
        Estimated financial exposure by country, last 12 months. Click a
        country to load its compliance detail.
      </Text>

      <Box
        display="grid"
        gridTemplateColumns={{ base: "1fr", xl: "minmax(0, 1fr) 300px" }}
        gap={{ base: "16px", md: "22px" }}
        mt={{ base: "22px", md: "30px" }}
        alignItems="stretch"
      >
        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="10px"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          transition="background-color 0.3s, border-color 0.3s"
        >
          <Flex
            wrap="wrap"
            gap="10px"
            align="center"
            justify="space-between"
            px="18px"
            py="15px"
            borderBottomWidth="1px"
            borderColor="border.tint"
          >
            <Box>
              <Text
                fontFamily="mono"
                fontSize="11.5px"
                letterSpacing="0.12em"
                textTransform="uppercase"
                color="fg.default"
              >
                Financial exposure by country
              </Text>
              <Text fontFamily="mono" fontSize="11px" color="fg.muted" mt="5px">
                {countryIndex
                  ? `${countryIndex.rows.length} countries and territories · ${formatCurrency(countryIndex.total)} total exposure`
                  : "Loading…"}
              </Text>
            </Box>
            <ChakraButtonEl
              type="button"
              onClick={handleReset}
              borderWidth="1px"
              borderColor="border.strong"
              borderRadius="7px"
              bg="transparent"
              color="fg.subtle"
              px="11px"
              py="7px"
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.06em"
              textTransform="uppercase"
              cursor="pointer"
              transition="border-color 0.2s, color 0.2s"
              _hover={{ borderColor: "fg.default", color: "fg.default" }}
            >
              Reset view
            </ChakraButtonEl>
          </Flex>

          <Box position="relative" ref={mapRowRef}>
            <style>{`
              .monitoring-map path.country { stroke:#F1E4C3; stroke-width:.5px; cursor:pointer; transition:fill .15s ease; }
              .monitoring-map path.country.nodata { fill:#F0E8D2; cursor:default; }
              .monitoring-map path.country:hover { stroke:#141A24; stroke-width:1.1px; }
              .monitoring-map path.country.sel { stroke:#141A24; stroke-width:1.6px; }
            `}</style>
            <Box className="monitoring-map">
              <ChakraSvg
                ref={svgRef}
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                role="img"
                aria-label="World map shaded by study count per facility country"
                display="block"
                w="100%"
                h="auto"
              />
            </Box>
            {(dataStatus !== "ready" || mapStatus !== "ready") && (
              <Flex
                position="absolute"
                inset="0"
                align="center"
                justify="center"
              >
                <Text fontFamily="mono" fontSize="12px" color="fg.muted">
                  {dataStatus === "error"
                    ? "Failed to load facility-country data. Check the connection and reload."
                    : mapStatus === "error"
                      ? "Map geometry failed to load. Check the network connection and reload."
                      : "Loading map…"}
                </Text>
              </Flex>
            )}
            <Box
              position="absolute"
              zIndex={5}
              pointerEvents="none"
              bg="sidebarInk"
              color="#F6F1E3"
              px="11px"
              py="8px"
              fontFamily="mono"
              fontSize="11.5px"
              lineHeight="1.5"
              whiteSpace="nowrap"
              opacity={tooltip.visible ? 1 : 0}
              transition="opacity .12s ease"
              left={`${tooltip.x}px`}
              top={`${tooltip.y}px`}
              transform={
                tooltip.below
                  ? "translate(-50%, 28%)"
                  : "translate(-50%, -135%)"
              }
            >
              <Text
                fontFamily="heading"
                fontSize="13px"
                fontWeight="600"
                letterSpacing="-0.01em"
              >
                {tooltip.title}
              </Text>
              {tooltip.body}
            </Box>
          </Box>

          <Flex
            wrap="wrap"
            gap="14px"
            align="flex-end"
            px="18px"
            py="12px"
            borderTopWidth="1px"
            borderColor="border.tint"
          >
            <Text fontFamily="mono" fontSize="10.5px" color="fg.muted">
              Exposure
            </Text>
            <Flex gap="6px">
              {MONITORING_RAMP.map((color, i) => (
                <Flex key={color} direction="column" gap="5px">
                  <Box w="66px" h="12px" bg={color} />
                  <Text
                    fontFamily="mono"
                    fontSize="10px"
                    color="fg.subtle"
                    whiteSpace="nowrap"
                  >
                    {MONITORING_STEP_LABELS[i]}
                  </Text>
                </Flex>
              ))}
            </Flex>
            <Text
              fontFamily="mono"
              fontSize="10.5px"
              color="fg.muted"
              ml="auto"
            >
              Grey = no reported exposure
            </Text>
          </Flex>
        </Box>

        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="10px"
          overflow="hidden"
          display="flex"
          flexDirection="column"
          transition="background-color 0.3s, border-color 0.3s"
        >
          <Box
            px="18px"
            py="15px"
            borderBottomWidth="1px"
            borderColor="border.tint"
          >
            <Text
              fontFamily="mono"
              fontSize="11.5px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="fg.default"
            >
              Top countries
            </Text>
            <Text fontFamily="mono" fontSize="11px" color="fg.muted" mt="5px">
              By financial exposure
            </Text>
          </Box>
          <Flex direction="column" flex="1">
            {countryIndex ? (
              <>
                {countryIndex.rows.slice(0, 10).map((row, i) => {
                  const key = normalizeCountryName(row.name);
                  return (
                    <RankRow
                      key={row.name}
                      index={i + 1}
                      name={row.name}
                      metric={{
                        value: row.value,
                        maxValue: countryIndex.rows[0]?.value ?? 1,
                      }}
                      selected={selectedKey === key}
                      onSelect={() => setSelectedKey(key)}
                    />
                  );
                })}
                <RankRow
                  index={null}
                  name="No country recorded"
                  caption="View analytics"
                  selected={selectedKey === "nullcountry"}
                  onSelect={() => setSelectedKey("nullcountry")}
                  muted
                />
              </>
            ) : (
              <Flex flex="1" align="center" justify="center" p="18px">
                <Text fontFamily="mono" fontSize="12px" color="fg.muted">
                  {dataStatus === "error" ? "Failed to load data." : "Loading…"}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>
      </Box>

      <Box
        ref={detailRef}
        mt={{ base: "16px", md: "22px" }}
        scrollMarginTop="20px"
      >
        {selected && countryIndex ? (
          <DetailPanel
            key={selectedKey}
            record={selected}
            isNull={isNullSelection}
            rows={countryIndex.rows}
            total={countryIndex.total}
          />
        ) : (
          <Box
            borderWidth="1px"
            borderStyle="dashed"
            borderColor="border.strong"
            borderRadius="10px"
            bg="bg.surface"
            p={{ base: "26px", md: "44px" }}
            transition="background-color 0.3s, border-color 0.3s"
          >
            <Text
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.14em"
              textTransform="uppercase"
              color="fg.muted"
            >
              No country selected
            </Text>
            <Text
              mt="12px"
              fontSize="19px"
              lineHeight="1.45"
              letterSpacing="-0.02em"
              color="fg.body"
              maxW="54ch"
            >
              Monitoring detail is scoped to one country at a time. Click a
              country on the map, or pick one from the ranked list, to load its
              tiles. Records with no recorded country are at the bottom of
              that list.
            </Text>
          </Box>
        )}
      </Box>
    </>
  );
}

function RankRow({
  index,
  name,
  metric,
  caption,
  selected,
  onSelect,
  muted,
}: {
  index: number | null;
  name: string;
  metric?: { value: number; maxValue: number };
  caption?: string;
  selected: boolean;
  onSelect: () => void;
  muted?: boolean;
}) {
  return (
    <ChakraButtonEl
      type="button"
      onClick={onSelect}
      display="flex"
      flex="1 1 0"
      minH="38px"
      alignItems="center"
      gap="10px"
      w="100%"
      textAlign="left"
      borderStyle="solid"
      borderTopWidth={muted ? "1px" : 0}
      borderRightWidth={0}
      borderBottomWidth={muted ? 0 : "1px"}
      borderLeftWidth={0}
      borderColor={muted ? "border.default" : "border.tint"}
      bg={selected ? "gt.50" : muted ? "bg.canvas" : "bg.surface"}
      px="14px"
      py="9px"
      cursor="pointer"
      transition="background-color 0.15s"
      _hover={{ bg: "gt.50" }}
    >
      <Text
        fontFamily="mono"
        fontSize="10.5px"
        color={muted ? "fg.subtle" : "fg.muted"}
        w="18px"
        flexShrink={0}
      >
        {index !== null ? String(index).padStart(2, "0") : "—"}
      </Text>
      <Text
        flex="1"
        minW={0}
        fontSize="13.5px"
        fontWeight={muted ? 500 : 600}
        letterSpacing="-0.015em"
        color={muted ? "fg.subtle" : "fg.default"}
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {name}
      </Text>
      {metric ? (
        <>
          <Box flexShrink={0} w="64px" h="8px" bg="border.tint" borderRadius="full" overflow="hidden">
            <Box
              h="8px"
              bg="gt.500"
              borderRadius="full"
              transition="width 0.5s cubic-bezier(0.16,1,0.3,1)"
              w={`${Math.max(4, (metric.value / metric.maxValue) * 100)}%`}
            />
          </Box>
          <Text
            fontFamily="mono"
            fontSize="11.5px"
            w="56px"
            textAlign="right"
            flexShrink={0}
          >
            {formatCurrency(metric.value)}
          </Text>
        </>
      ) : (
        <Text
          fontFamily="mono"
          fontSize="10.5px"
          letterSpacing="0.02em"
          color="fg.subtle"
          whiteSpace="nowrap"
          flexShrink={0}
        >
          {caption}
        </Text>
      )}
    </ChakraButtonEl>
  );
}

function DetailPanel({
  record,
  isNull,
  rows,
  total,
}: {
  record: CountryRow;
  isNull: boolean;
  rows: CountryRow[];
  total: number;
}) {
  const rankIdx = rows.findIndex((r) => r.name === record.name) + 1;
  const share = (record.value / total) * 100;
  const countryLabel = isNull ? "No country recorded" : record.name;

  const { auth } = useThoughtSpotAuth();
  const embedRef = useEmbedRef<typeof LiveboardEmbed>();

  const [caseCompletionRate, setCaseCompletionRate] = useState<string | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleVizPointClick: NonNullable<
    React.ComponentProps<typeof LiveboardEmbed>["onVizPointClick"]
  > = useCallback((event) => {
    const data = event?.data as
      | {
          vizId?: string;
          clickedPoint?: { selectedMeasures?: { value?: unknown }[] };
        }
      | undefined;
    if (data?.vizId !== THOUGHTSPOT_COMPLETION_RATE_TREND_VIZ_ID) return;

    const measures = data.clickedPoint?.selectedMeasures;
    if (!measures || measures.length === 0) {
      setCaseCompletionRate(null);
      return;
    }

    // Unlike the old "Completion Rate" measure (a 0–1 fraction), "Completion
    // Percentage" here is already on a 0–100 scale, so it's displayed as-is.
    const rawValue = measures[0]?.value;
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    setCaseCompletionRate(
      Number.isFinite(value) ? `${value.toFixed(1)}%` : null,
    );
  }, []);

  const handleSubmitCase = async () => {
    setSubmitting(true);
    const delay = 1000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));
    setSubmitting(false);
    setDialogOpen(false);
    setComments("");
  };

  return (
    <Box animation="fade .3s ease both">
      <Flex
        justify="space-between"
        align="flex-start"
        gap="16px"
        wrap="wrap"
        mb={{ base: "16px", md: "22px" }}
      >
        <Box>
          <Heading
            as="h2"
            fontSize={{ base: "22px", md: "30px" }}
            fontWeight="700"
            letterSpacing="-0.04em"
            lineHeight="1.1"
          >
            {isNull ? "Records with no country recorded" : record.name}
          </Heading>
          <Text fontFamily="mono" fontSize="12px" color="fg.subtle" mt="8px">
            {isNull
              ? "Country is missing on these records · not shaded on the map"
              : `Rank ${rankIdx} of ${rows.length} · ${share.toFixed(share < 1 ? 2 : 1)}% of global exposure`}
          </Text>
        </Box>

        {caseCompletionRate !== null && (
          <Button
            type="button"
            variant="solid"
            fontSize="15px"
            px="32px"
            py="20px"
            flexShrink={0}
            onClick={() => setDialogOpen(true)}
          >
            Open Case
          </Button>
        )}
      </Flex>

      <Flex wrap="wrap" gap="10px" align="center" pb="18px">
        <Text
          fontFamily="mono"
          fontSize="11px"
          letterSpacing="0.14em"
          textTransform="uppercase"
          color="fg.muted"
          mr="4px"
        >
          Filters
        </Text>
        {FILTER_COLUMNS.map((filter) => (
          <ChakraButtonEl
            key={filter.columnId}
            type="button"
            onClick={() =>
              embedRef.current?.trigger(HostEvent.OpenFilter, {
                column: { columnId: filter.columnId },
              })
            }
            display="flex"
            alignItems="center"
            gap="9px"
            borderWidth="1px"
            borderRadius="8px"
            borderColor="border.strong"
            bg="bg.canvas"
            color="fg.default"
            px="14px"
            py="10px"
            fontFamily="mono"
            fontSize="12px"
            letterSpacing="0.04em"
            cursor="pointer"
            transition="background-color 0.2s, color 0.2s, border-color 0.2s, transform 0.15s"
            _hover={{ bg: "fg.default", color: "bg.canvas", borderColor: "fg.default", transform: "translateY(-1px)" }}
            _active={{ transform: "scale(0.97)" }}
          >
            <Box w="5px" h="5px" borderRadius="full" bg="gt.400" />
            {filter.label}
          </ChakraButtonEl>
        ))}
        <VeraChat trigger="button" />
      </Flex>

      <Box minH="600px">
        {auth.status === "authenticated" ? (
          <LiveboardEmbed
            ref={embedRef}
            liveboardId={THOUGHTSPOT_LIVEBOARD_COUNTRY_STATS_ID}
            fullHeight
            minimumHeight={600}
            frameParams={{ width: "100%" }}
            runtimeFilters={[
              {
                columnName: "Country Name",
                operator: RuntimeFilterOp.EQ,
                values: [isNull ? "{Null}" : record.name],
              },
            ]}
            onVizPointClick={handleVizPointClick}
          />
        ) : (
          <Flex align="center" justify="center" minH="600px">
            <Text fontFamily="mono" fontSize="12px" color="fg.muted">
              Signing in…
            </Text>
          </Flex>
        )}
      </Box>

      {dialogOpen && (
        <Portal>
        <Box position="fixed" inset={0} zIndex={70}>
          {/* Backdrop lives on its own non-transformed layer, as a sibling
              of the card rather than its ancestor — nesting a solid-bg card
              inside a backdrop-filter element is a known Chromium
              compositing bug where the card renders see-through to
              whatever's behind the overlay. */}
          <Box
            position="absolute"
            inset={0}
            bg="rgba(20, 26, 36, 0.58)"
            backdropFilter="blur(3px)"
            onClick={() => {
              if (!submitting) setDialogOpen(false);
            }}
          />
          <Flex
            position="absolute"
            inset={0}
            align="center"
            justify="center"
            p={{ base: "14px", md: "48px" }}
            onClick={() => {
              if (!submitting) setDialogOpen(false);
            }}
          >
          <Box
            onClick={(event) => event.stopPropagation()}
            w="100%"
            maxW="440px"
            bg="bg.surface"
            borderWidth="1px"
            borderColor="fg.default"
            borderTopWidth="3px"
            borderTopColor="gt.500"
            borderRadius="12px"
            isolation="isolate"
            boxShadow="0 30px 70px rgba(20, 26, 36, 0.3)"
            p="24px"
          >
            <Text
              fontFamily="mono"
              fontSize="11px"
              letterSpacing="0.12em"
              textTransform="uppercase"
              color="gt.500"
            >
              New case
            </Text>
            <Heading
              as="h2"
              mt="10px"
              fontSize="22px"
              letterSpacing="-0.02em"
              fontWeight="700"
            >
              {countryLabel}
            </Heading>

            <Stack gap="16px" mt="20px">
              <Field.Root>
                <Field.Label
                  fontFamily="mono"
                  fontSize="11.5px"
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="fg.subtle"
                >
                  Country
                </Field.Label>
                <Input
                  value={countryLabel}
                  readOnly
                  disabled
                  bg="bg.canvas"
                  borderColor="border.strong"
                  borderRadius="8px"
                  px="15px"
                  py="12px"
                  h="auto"
                  fontSize="14px"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label
                  fontFamily="mono"
                  fontSize="11.5px"
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="fg.subtle"
                >
                  Completion rate
                </Field.Label>
                <Input
                  value={caseCompletionRate ?? ""}
                  readOnly
                  disabled
                  bg="bg.canvas"
                  borderColor="border.strong"
                  borderRadius="8px"
                  px="15px"
                  py="12px"
                  h="auto"
                  fontSize="14px"
                />
              </Field.Root>

              <Field.Root>
                <Field.Label
                  fontFamily="mono"
                  fontSize="11.5px"
                  letterSpacing="0.12em"
                  textTransform="uppercase"
                  color="fg.subtle"
                >
                  Comments
                </Field.Label>
                <Textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  disabled={submitting}
                  placeholder="Add context for the case…"
                  bg="bg.canvas"
                  borderColor="border.strong"
                  borderRadius="8px"
                  fontSize="14px"
                  rows={4}
                />
              </Field.Root>
            </Stack>

            <Flex gap="10px" mt="22px">
              <Button
                type="button"
                variant="solid"
                flex="1"
                disabled={submitting}
                loading={submitting}
                loadingText="Submitting…"
                onClick={handleSubmitCase}
              >
                Submit case
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
            </Flex>
          </Box>
          </Flex>
        </Box>
        </Portal>
      )}
    </Box>
  );
}

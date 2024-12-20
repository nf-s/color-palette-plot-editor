import Color, { SpaceAccessor } from "colorjs.io";
import { MouseEvent, TouchEvent, useCallback, useState } from "react";
import { PickProperties } from "ts-essentials";
import "./App.css";

import { Point, ResponsiveLine, SliceTooltipProps } from "@nivo/line";
import ColorJs from "colorjs.io";
import { ColorSpace } from "colorjs.io/fn";
import Select from "react-select";
import { v4 as uuidv4 } from "uuid";

const initialColors = [
  "#440154",
  "#482475",
  "#414487",
  "#355f8d",
  "#2a788e",
  "#21918c",
  "#22a884",
  "#44bf70",
  "#7ad151",
  "#bddf26",
  "#fde725",
];

type SpaceAccessorKey = keyof PickProperties<Color, SpaceAccessor>;

interface SpaceValue {
  id: string;
  label: string;
  space: ColorSpace;
  spaceId: SpaceAccessorKey;
  dimension: string;
}

// Descriptions pulled from https://github.com/color-js/color.js/blob/main/data/modules.json
// License: MIT
// Copyright (c) 2021 Lea Verou, Chris Lilley
// Full license https://github.com/color-js/color.js/blob/main/LICENSE

// const spaceDescriptions: Partial<Record<SpaceAccessorKey, string>> = {
//   cam16_jmh:
//     "An improved and simplified development from the earlier CIECAM02 Color Appearance Model, CAM16 provides three perceptual attributes: lightness J, colorfulness M and hue quadrature h. The default viewing conditions are: D65 white point, adapting luminance of 64 lux (4 cd/m²), average surround and less than full chromatic adaptation. This does mean that what other color models consider to be achromatic colors may have a non-zero colorfulness (M).",
//   hpluv:
//     "The HPLuv color space emphasizes perceptual uniformity specifically in its lightness component. HPLuv ensures that changes in lightness are consistently perceived by the human eye, regardless of the hue or saturation of the color. The resulting palette is a subset of sRGB and the colors are mainly pastel.",
//   hsluv:
//     "The HSLuv color space is a perceptually uniform adaptation of the traditional HSL (Hue, Saturation, Lightness) color model. Engineered upon the foundations of the CIELUV color space, HSLuv ensures that colors that appear equally spaced in its representation also present consistent perceptual differences to the human observer. This results in a color space where changes in hue, saturation, or lightness produce predictable and coherent visual outcomes, addressing inconsistencies and unpredictable color shifts often found in standard HSL.",
//   hsl: "Polar transformation of sRGB, supported as early as CSS Color Level 3. Beware the perceptually non-uniform hue, and don't compare the lightness of colors with different hue.",
//   hsv: "Yet another polar transformation of sRGB, supported in, for example, Adobe CS software.",
//   hwb: "Another polar transformation of sRGB with hue, whiteness, and blackness coordinates.",
//   lch: "LCH is the polar form of Lab. Instead of juggling a and b, you specify a Hue angle (starting from the positive a axis) and a Chroma, or colorfulness, which is zero for neutral greys and increases as a color becomes more intensely colorful.",
//   lchuv: "The polar (Hue, Chroma) form of CIE Luv.",
//   oklch:
//     "The polar (Hue, Chroma) form of OK Lab - An improved version of CIE Lab, with improved hue linearity and orthogonality; derived from optimized LMS basis functions. Cube root transfer function.",
// };

const availableSpaceDimensions: SpaceValue[] = Object.entries(ColorJs.spaces)
  .map(([spaceId, space]) =>
    Object.keys(space.coords).map((dimension) => ({
      id: uuidv4(),
      label: `${space.name} - ${dimension}`,
      space,
      spaceId: spaceId.replace("-", "_") as SpaceAccessorKey,
      dimension,
    }))
  )
  .flat()
  .filter((spaceDimension) => {
    const testColor = new Color("#000");
    if (!spaceDimension.space.coords[spaceDimension.dimension]) {
      console.error(
        `Dimension ${spaceDimension.dimension} not found in space ${spaceDimension.spaceId}`
      );
      return false;
    }
    if (
      testColor[spaceDimension.spaceId]?.[spaceDimension.dimension] ===
      undefined
    ) {
      console.error(
        `Dimension ${spaceDimension.dimension} not found in space ${spaceDimension.spaceId}`
      );
      return false;
    }
    return true;
  });

availableSpaceDimensions.forEach((spaceDimension) => {
  const testColor = new Color("#000");
  if (!spaceDimension.space.coords[spaceDimension.dimension]) {
    throw new Error(
      `Dimension ${spaceDimension.dimension} not found in space ${spaceDimension.spaceId}`
    );
  }
  if (
    testColor[spaceDimension.spaceId][spaceDimension.dimension] === undefined
  ) {
    throw new Error(
      `Dimension ${spaceDimension.dimension} not found in space ${spaceDimension.spaceId}`
    );
  }
});

const defaultSpaceDimensions: SpaceValue[] = availableSpaceDimensions.filter(
  (sd) => sd.spaceId === "oklch"
);

interface ColorPoint {
  index: number;
  colorString: string;
  spaceValues: (SpaceValue & { value: number })[];
}

function ColorChart({
  colorPoints,
  setColors,
  spaceDimension,
}: {
  colorPoints: ColorPoint[];
  setColors: (fn: (previous: string[]) => string[]) => void;
  spaceDimension: SpaceValue;
}) {
  const points = colorPoints.map((point) => ({
    x: point.index,
    y: point.spaceValues.find(
      (pointSpaceValue) =>
        pointSpaceValue.spaceId === spaceDimension.spaceId &&
        pointSpaceValue.dimension === spaceDimension.dimension
    )?.value,
    ...point,
  }));

  const min =
    spaceDimension.space.coords[spaceDimension.dimension].refRange?.[0] ?? 0;
  const max =
    spaceDimension.space.coords[spaceDimension.dimension].refRange?.[1] ?? 1;

  const updatePoint = useCallback(
    (point: Point, event: MouseEvent | TouchEvent) => {
      const slice = point as unknown as SliceTooltipProps["slice"];

      if (
        event.nativeEvent.target instanceof Element &&
        ("touches" in event ||
          ("buttons" in event &&
            (event.buttons === 1 || event.type === "click")))
      ) {
        const clientY =
          "touches" in event ? event.touches[0].clientY : event.clientY;

        if (typeof clientY === "undefined") return;
        const rect = event.nativeEvent.target?.getBoundingClientRect();
        const newValue =
          (1 - (clientY - rect.top) / slice.height) * (max - min) + min;

        if (newValue !== null) {
          setColors((prev: string[]) => {
            const newColors = [...prev];
            const newColor = new Color(prev[slice.points[0].index]);

            newColor[spaceDimension.spaceId][spaceDimension.dimension] =
              newValue;
            newColors[slice.points[0].index] = newColor.toString({
              format: "hex",
            });

            return newColors;
          });
        }

        event.stopPropagation();
        return true;
      }
    },
    [setColors, spaceDimension.spaceId, spaceDimension.dimension, max, min]
  );

  return (
    <div className="h-full w-full">
      <div className="flex justify-between">
        <h2 className="font-bold text-md md:text-xl text-nowrap">
          {spaceDimension.space.name} - {spaceDimension.dimension}
        </h2>
        <button
          className="font-light text-xs font-mono"
          onClick={() => {
            setColors((prev: string[]) => {
              const firstColor = new Color(prev[0]);
              const lastColor = new Color(prev[prev.length - 1]);

              const firstValue =
                firstColor[spaceDimension.spaceId][spaceDimension.dimension];
              const lastValue =
                lastColor[spaceDimension.spaceId][spaceDimension.dimension];

              return prev.map((colorString, i) => {
                const newColor = new Color(colorString);
                newColor[spaceDimension.spaceId][spaceDimension.dimension] =
                  i * ((lastValue - firstValue) / (prev.length - 1)) +
                  firstValue;

                return newColor.toString({
                  format: "hex",
                });
              });
            });
          }}
        >
          spread linearly
        </button>
      </div>
      <div className="h-[calc(100%-56px)]">
        <ResponsiveLine
          data={[{ id: spaceDimension.label, data: points }]}
          xScale={{ type: "point" }}
          yScale={{
            type: "linear",
            min,
            max,
            stacked: true,
            reverse: false,
          }}
          yFormat=" >-.2f"
          pointSize={10}
          pointBorderWidth={2}
          onMouseMove={updatePoint}
          onClick={updatePoint}
          onTouchMove={updatePoint}
          isInteractive
          enableSlices="x"
        />
      </div>
    </div>
  );
}

function App() {
  const [showInitialColors, setShowInitialColors] = useState(false);
  const [colors, setColors] = useState(initialColors);
  const [selectedSpaceDimensions, setSelectedSpaceDimensions] = useState<
    SpaceValue[]
  >(defaultSpaceDimensions);

  const points: ColorPoint[] = colors.map((c, i) => {
    const col = new Color(c);

    return {
      colorString: c,
      index: i,
      spaceValues: availableSpaceDimensions.map((sv) => ({
        ...sv,
        value: col[sv.spaceId][sv.dimension],
      })),
    };
  });

  return (
    <div className="p-4 w-full h-screen flex gap-2 md:gap-3 flex-col font-mono">
      <div className="flex flex-col md:flex-row justify-between gap-2">
        <h1 className="text-xl md:text-3xl font-bold text-nowrap ">
          Color palette plot
        </h1>
        <Select
          className="flex-grow text-sm"
          isMulti
          getOptionValue={(option) => option.id}
          defaultValue={defaultSpaceDimensions}
          onChange={(selected) => {
            setSelectedSpaceDimensions(
              selected
                .map((s) =>
                  availableSpaceDimensions.find((sd) => sd.id === s.id)
                )
                .filter((s) => s !== undefined) as SpaceValue[]
            );
          }}
          options={availableSpaceDimensions}
          closeMenuOnSelect={false}
        />
        <button
          className="pointer border-[#ccc] hover:border-[#b3b3b3] border-solid border rounded px-2 py-1 text-nowrap text-sm font-mono"
          onClick={() => setShowInitialColors((prev) => !prev)}
        >
          {showInitialColors ? "Hide" : "Show"} initial colors
        </button>
      </div>

      <div>
        {showInitialColors ? (
          <div className="flex flex-row w-full">
            {initialColors.map((c, i) => (
              <div
                key={i}
                className="flex-grow h-10 md:h-20"
                style={{ backgroundColor: c }}
              >
                &nbsp;
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex flex-row w-full">
          {colors.map((c, i) => (
            <div
              key={i}
              className="flex-grow h-10 md:h-20"
              style={{ backgroundColor: c }}
            >
              &nbsp;
            </div>
          ))}
        </div>
      </div>

      <div className="flex-grow overflow-y-auto">
        {selectedSpaceDimensions.map((spaceDimension, i) => (
          <div key={i} className="h-48">
            <ColorChart
              colorPoints={points}
              setColors={setColors}
              spaceDimension={spaceDimension}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs">
          Note: you can copy-paste{" "}
          <a
            className="underline text-teal-600"
            href="https://observablehq.com/@d3/color-schemes"
            target="_blank"
          >
            D3 color schemes in
          </a>
        </div>
        <textarea
          className="w-full font-mono text-sm"
          value={JSON.stringify(colors)}
          onChange={(e) => {
            try {
              const newColors = JSON.parse(e.target.value);
              if (!Array.isArray(newColors)) {
                throw "Not an array";
              }
              newColors.forEach((colString) => {
                try {
                  new Color(colString);
                } catch (e) {
                  console.error(e);
                  throw "Invalid color: " + colString;
                }
              });
              setColors(JSON.parse(e.target.value));
            } catch (e) {
              alert("Invalid JSON" + e);
              console.error(e);
            }
          }}
        />
      </div>
    </div>
  );
}

export default App;

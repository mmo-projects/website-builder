import {
  useRef,
  useCallback,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from "react";
import {
  atom,
  computed,
  type ReadableAtom,
  type WritableAtom,
} from "nanostores";
import type {
  Page,
  Asset,
  DataSource,
  Instance,
  Prop,
} from "@webstudio-is/sdk";
import { createElementsTree } from "./create-elements-tree";
import {
  WebstudioComponent,
  type WebstudioComponentProps,
} from "./webstudio-component";
import { getPropsByInstanceId } from "../props";
import type { Components } from "../components/components-utils";
import type { Params, DataSourceValues } from "../context";
import type { GeneratedUtils } from "../generator";
import type { ImageLoader } from "@webstudio-is/image";

export type RootPropsData = {
  params?: Params;
  page: Page;
  pages: Array<Page>;
  assets: Array<Asset>;
  build: {
    instances: [Instance["id"], Instance][];
    dataSources: [DataSource["id"], DataSource][];
    props: [Prop["id"], Prop][];
  };
};

type RootProps = {
  data: RootPropsData;
  utils: GeneratedUtils;
  Component?: ForwardRefExoticComponent<
    WebstudioComponentProps & RefAttributes<HTMLElement>
  >;
  components: Components;
  scripts?: ReactNode;
  imageLoader: ImageLoader;
};

export const InstanceRoot = ({
  data,
  utils,
  Component,
  components,
  scripts,
  imageLoader,
}: RootProps): JSX.Element | null => {
  const {
    indexesWithinAncestors,
    executeComputingExpressions,
    executeEffectfulExpression,
  } = utils;
  const dataSourceVariablesStoreRef = useRef<
    undefined | WritableAtom<DataSourceValues>
  >(undefined);
  if (dataSourceVariablesStoreRef.current === undefined) {
    dataSourceVariablesStoreRef.current = atom(new Map());
  }
  const dataSourceVariablesStore = dataSourceVariablesStoreRef.current;

  const dataSourceValuesStoreRef = useRef<
    undefined | ReadableAtom<DataSourceValues>
  >(undefined);
  if (dataSourceValuesStoreRef.current === undefined) {
    dataSourceValuesStoreRef.current = computed(
      dataSourceVariablesStore,
      (dataSourceVariables) => {
        // set vriables with defaults
        const dataSourceValues: DataSourceValues = new Map();
        for (const [dataSourceId, dataSource] of data.build.dataSources) {
          if (dataSource.type === "variable") {
            const value =
              dataSourceVariables.get(dataSourceId) ?? dataSource.value.value;
            dataSourceValues.set(dataSourceId, value);
          }
        }

        // set expression values
        try {
          const result = executeComputingExpressions(dataSourceValues);
          for (const [id, value] of result) {
            dataSourceValues.set(id, value);
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
        }

        return dataSourceValues;
      }
    );
  }
  const dataSourceValuesStore = dataSourceValuesStoreRef.current;

  const onDataSourceUpdate = useCallback(
    (newValues: DataSourceValues) => {
      const dataSourceVariables = new Map(dataSourceVariablesStore.get());
      for (const [dataSourceId, value] of newValues) {
        dataSourceVariables.set(dataSourceId, value);
      }
      dataSourceVariablesStore.set(dataSourceVariables);
    },
    [dataSourceVariablesStore]
  );

  return createElementsTree({
    imageLoader,
    imageBaseUrl: data.params?.imageBaseUrl ?? "/",
    assetBaseUrl: data.params?.assetBaseUrl ?? "/",
    instances: new Map(data.build.instances),
    rootInstanceId: data.page.rootInstanceId,
    propsByInstanceIdStore: atom(
      getPropsByInstanceId(new Map(data.build.props))
    ),
    assetsStore: atom(new Map(data.assets.map((asset) => [asset.id, asset]))),
    pagesStore: atom(new Map(data.pages.map((page) => [page.id, page]))),
    indexesWithinAncestors,
    executeEffectfulExpression,
    dataSourceValuesStore,
    onDataSourceUpdate,
    Component: Component ?? WebstudioComponent,
    components,
    scripts,
  });
};

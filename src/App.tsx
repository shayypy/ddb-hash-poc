import { useEffect, useState } from "react";
import "./index.css";
import { DiscDBClient, getImageUrl, type MediaItemType } from "discdbapi";

const DVD_EXT = ["vob", "bup", "ifo"];

const BD_EXT = ["m2ts"];

const Violet = (
  props: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLSpanElement>,
    HTMLSpanElement
  >,
) => <span className="text-violet-300" {...props} />;

interface HashReleaseResult {
  item: {
    title: string;
    year: number;
    slug: string;
    type: MediaItemType;
    imageUrl: string | null;
  };
  title: string;
  year: number;
  slug: string;
  imageUrl: string | null;
  discCount: number;
}

export function App() {
  const [detectedType, setDetectedType] = useState<"dvd" | "bluray">();
  const [hash, setHash] = useState<string>();
  const [releases, setReleases] = useState<HashReleaseResult[]>();

  useEffect(() => {
    if (hash === undefined) {
      setReleases(undefined);
      return;
    }

    fetch(`/api/releases/${hash}`, { method: "GET" }).then(async (resp) => {
      if (!resp.ok) {
        alert(
          "Failed to fetch releases for this hash, see console for details.",
        );
        console.error(await resp.text());
        return;
      }
      const data = (await resp.json()) as HashReleaseResult[];
      setReleases(data);
    });
  }, [hash]);

  return (
    <div className="max-w-2xl mx-auto p-8 text-left relative z-10">
      <p>
        Click the button and navigate to your disc in the sidebar. If you see a{" "}
        <Violet>VIDEO_TS</Violet> folder, select all files in there. Otherwise,
        if you see <Violet>BDMV</Violet>, open it
        <span className="align-super text-xs text-gray-400">1</span>, then
        select all files in <Violet>STREAM</Violet>.
      </p>
      <p className="text-sm text-gray-400">
        <span className="text-xs">1.</span> If you are using MacOS, you may need
        to control-click <Violet>BDMV</Violet> and choose "show package
        contents" to open it.
      </p>
      <form
        className="flex gap-2 items-center"
        onReset={() => {
          setDetectedType(undefined);
          setHash(undefined);
        }}
      >
        <input
          type="file"
          multiple
          // BDMV can't be opened as a directory on macos unless there is no 'accept', apparently
          // accept=".BUP,.IFO,.VOB,BDMV,.m2ts"
          className="ms-auto rounded-lg bg-gray-50 border-2 text-gray-800 px-2 py-0.5 mt-2 active:bg-gray-300 transition-colors"
          onChange={async (e) => {
            const files = e.currentTarget.files;
            if (!files) {
              alert("No files selected");
              return;
            }
            setDetectedType(undefined);
            setHash(undefined);

            const hashable: File[] = [];
            let type: "dvd" | "bluray" | undefined;
            for (const file of files) {
              for (const ext of DVD_EXT) {
                if (file.name.toLowerCase().endsWith(`.${ext}`)) {
                  type = "dvd";
                  hashable.push(file);
                }
              }
              for (const ext of BD_EXT) {
                if (file.name.toLowerCase().endsWith(`.${ext}`)) {
                  type = "bluray";
                  hashable.push(file);
                }
              }
            }

            if (!type) {
              alert("Failed to find any applicable files");
              return;
            }
            setDetectedType(type);
            // Could be done in-browser, but I'm using the API for convenience
            const discdb = new DiscDBClient({ origin });
            const hash = await discdb.hash(hashable);
            setHash(hash);
          }}
        />
        <button
          type="reset"
          className="text-lg mt-1.5 text-neutral-400 cursor-pointer me-auto"
        >
          X
        </button>
      </form>
      {detectedType ? (
        <>
          <hr className="my-4 border-neutral-600 rounded" />
          <div>
            <p>Detected type: {detectedType}</p>
            <p>Hash: {hash ?? "computing..."}</p>
            {releases ? (
              releases.length === 0 ? (
                <p>No releases found for this hash.</p>
              ) : (
                <div className="mt-1">
                  <p className="font-medium">Releases</p>
                  <div className="flex flex-col gap-1">
                    {releases.map((release) => (
                      <div
                        key={`${release.item.slug}/${release.slug}`}
                        className="rounded-lg bg-gray-700 py-3 px-4"
                      >
                        <div className="flex gap-4 items-center">
                          {(release.imageUrl ?? release.item.imageUrl) ? (
                            <img
                              src={getImageUrl(
                                // biome-ignore lint/style/noNonNullAssertion: Above
                                (release.imageUrl ?? release.item.imageUrl)!,
                                { height: 224, width: 168 },
                              )}
                              className="rounded-lg h-14 aspect-3/4"
                              alt=""
                            />
                          ) : (
                            <div className="rounded-lg h-14 aspect-3/4 bg-neutral-400" />
                          )}
                          <div>
                            <a
                              className="font-medium hover:text-violet-300 block"
                              href={`https://thediscdb.com/${release.item.type}/${release.item.slug}`}
                              target="_blank"
                            >
                              {release.item.title}
                            </a>
                            <a
                              className="text-sm hover:text-violet-300 block"
                              href={`https://thediscdb.com/${release.item.type}/${release.item.slug}/releases/${release.slug}`}
                              target="_blank"
                            >
                              <span>{release.title}</span>{" "}
                              <span className="text-gray-400">
                                {release.year}
                              </span>
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              <p>Fetching releases...</p>
            )}
          </div>
        </>
      ) : null}
      <hr className="my-4 border-neutral-600 rounded" />
      <ul className="list-disc text-sm">
        <li>
          Incomplete data: It is possible for a user to not select all files in
          the disc, making the hash incorrect. I think this could be verified
          somewhat by the MakeMKV logs, but it might not be totally robust. If
          you know what you're doing, it's probably fine.
        </li>
      </ul>
    </div>
  );
}

export default App;

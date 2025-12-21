import type {ProjectFile} from "../../../../types/file";
import {ContentType} from "~/const/ContentType";
import {useQuery} from "@tanstack/react-query";

const useFileContent = (file?: ProjectFile) => {
    const {data: content} = useQuery({
        queryKey: ['fileContent', file?.id],
        queryFn: async () => {
            if (!file) return null;

            const response = await fetch(file.s3Url);
            const content = await response.text();

            return {
                type: ContentType.TEXT,
                url: file.s3Url,
                content
            };
        },
        enabled: !!file,
    });

    return content;
}


export default useFileContent;

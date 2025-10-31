export interface Folder {
  id: number;
  name: string;
}

export interface Image {
  id: number;
  folderId: number;
  src: string;
  name: string;
  title: string;
  description: string;
  copyright: string;
}

export enum FilterType {
  NONE = 'none',
  GRAYSCALE = 'grayscale(100%)',
  SEPIA = 'sepia(100%)',
  INVERT = 'invert(100%)',
  BLUR = 'blur(5px)',
}

export interface Dimensions {
    width: number;
    height: number;
}

export class Story{
  slug : string;
  title : string;
  description : string;
  tags : string[];
  authors : string[];
  editors: string[];

  /*** hashmap with all page data */
  pages : { [page: number] : Page};

  /*** hashmap of all state */
  placeholders : { [variable : string ] : Placeholder };

}

export class Page{
  text : string;
  image : string;

  /*** for input, i[0] is input name, i[1] is placeholder */
  input : Array<string>;

  /*** for button, i[0] is button text, i[1] is desitnation page */  
  buttons : Array<Array<string>>;
}

export class Placeholder{
  description : string
  value: string
}

export class Cover{
  title : string;
  description : string;
  slug : string;
  tags : Array<string>;
  authors : string[];
  editors: string[];

  //aggregate data
  pageCount : number; 
  pageStats : any;
}
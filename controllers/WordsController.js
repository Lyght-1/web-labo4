const Repository = require('../models/Repository');
const CollectionFilter = require('../models/collectionFilter');
const { decomposePath } = require('../utilities');

module.exports = 
class WordsController extends require('./Controller') {
    constructor(req, res){
        super(req, res, false /* needAuthorization */);
        this.wordsRepository = new Repository('Words', true /* cached */);
    }
    error(params, message){
        params["error"] = message;
        this.response.JSON(params);
        return false;
    }

    get(){
        let params = this.getQueryStringParams(); 
        let collectionFilter= new CollectionFilter(this.wordsRepository.getAll(), params);
        this.response.JSON(collectionFilter.get());
    }
}
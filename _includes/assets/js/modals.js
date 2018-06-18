(function () {
    $('.modal-tabs > li > a ').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    var spawnNewElemFormIds = ['bool-submit', 'string-submit', 'number-submit', 'object-submit', 'array-submit'];
    var $elems = $(spawnNewElemFormIds.map(function (item) { return document.getElementById(item); }));
    window.spawnNewElemModal = function spawnNewElemModal(cb) {
        $('#new-item-modal').modal('show');
        $elems.off('submit.spawn-new-elem');
        $elems.on('submit.spawn-new-elem', function (e) {
            e.preventDefault();
            var payload = objectifyForm($(this).serializeArray());
            if (payload.type === 'boolean') payload.val = (payload.val === 'on') ? true : false;
            else if (payload.type === 'object') payload.val = {};
            else if (payload.type === 'array') payload.val = [];
            else payload.val = window.convert(payload.val, payload.type);
            cb(payload);
            $('#new-item-modal').modal('hide');
            return false;
        });
    };

    var $confirmModal = $('#confirm-modal');
    window.confirmModal = function(title, body, okTxt, cancelTxt, cb) {
        $confirmModal.find('.modal-title').text(title);
        $confirmModal.find('.modal-body').text(body);
        $('#modal-confirm-ok').text(okTxt);
        $('#modal-confirm-cancel').text(cancelTxt);
        // previous event remove
        $('modal-confirm-ok').off('click.confirm-modal');
        $('modal-confirm-cancel').off('click.confirm-modal');
        $confirmModal.find('.close').off('click.confirm-modal');
        $confirmModal.modal('show');
        $('#modal-confirm-ok').on('click.confirm-modal', function() { cb(true); });
        $confirmModal.find('.close').on('click.confirm-modal', function() { cb(false); });
        $('#modal-confirm-cancel').on('click.confirm-modal', function() { cb(false); });
    };

    var $formInputModal = $('#string-input-modal');
    window.formInputModal = function(title, body, isUncancelable, cb) {
        $formInputModal.find('.modal-title').html(title);
        $formInputModal.find('.modal-body').html(body);
        if (isUncancelable) {
            $formInputModal.find('.modal-footer').hide();
            $('#string-input-modal-dismiss').hide();
            $formInputModal.modal({ backdrop: 'static', keyboard: false });
        } else { 
            $formInputModal.find('.modal-footer').show();
            $('#string-input-modal-dismiss').show({ backdrop: true, keyboard: true });
            $formInputModal.find('.close').off('click.confirm-modal');
            $('#modal-string-input-cancel').off('click.confirm-modal');
            $formInputModal.find('.close').on('click.confirm-modal', function() { cb(false); });
            $('#modal-string-input-cancel').on('click.confirm-modal', function() { cb(false); });
        }
        $formInputModal.modal('show');
        $('#string-input-modal-form').off('submit.string-input-modal');
        $('#string-input-modal-form').on('submit.string-input-modal', function(e) {
            e.preventDefault();
            cb(objectifyForm($(this).serializeArray()));
            $formInputModal.modal('hide');
            return false;
        });
    };

    var $modalAlert = $('#modal-alert');
    window.modalAlert = function(title, body) {
        $modalAlert.find('.modal-title').html(title);
        $modalAlert.find('.modal-body').html(body);
        $modalAlert.modal('show');
    };

    function objectifyForm(formArray) {//serialize data function
        var returnArray = {};
        for (var i = 0; i < formArray.length; i++) {
            returnArray[formArray[i]['name']] = formArray[i]['value'];
        }
        return returnArray;
    }
})();